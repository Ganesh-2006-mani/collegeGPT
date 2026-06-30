import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content) return null;

  // Split content by code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="markdown-body text-sm md:text-base space-y-2">
      {parts.map((part, index) => {
        // Handle code blocks
        if (part.startsWith('```')) {
          const match = part.match(/```(\w*)\n([\s\S]*?)```/);
          const language = match ? match[1] : '';
          const code = match ? match[2] : part.slice(3, -3);

          return (
            <pre key={index} className="rounded-lg overflow-x-auto my-3 text-xs md:text-sm">
              {language && (
                <div className="text-[10px] text-gray-400 font-mono mb-1 uppercase tracking-wider select-none">
                  {language}
                </div>
              )}
              <code className="block whitespace-pre">{code.trim()}</code>
            </pre>
          );
        }

        // Handle inline components (lists, paragraphs, tables, bold text)
        const lines = part.split('\n');
        const renderedLines: React.ReactNode[] = [];
        let inList = false;
        let isNumbered = false;
        let listItems: string[] = [];
        let inTable = false;
        let tableHeader: string[] = [];
        let tableRows: string[][] = [];

        const flushList = (key: number) => {
          if (listItems.length > 0) {
            const ListTag = isNumbered ? 'ol' : 'ul';
            renderedLines.push(
              <ListTag key={`list-${key}`} className={isNumbered ? 'list-decimal pl-6 my-2' : 'list-disc pl-6 my-2'}>
                {listItems.map((item, itemIdx) => (
                  <li key={itemIdx} className="my-1">
                    {parseInline(item)}
                  </li>
                ))}
              </ListTag>
            );
            listItems = [];
            inList = false;
          }
        };

        const flushTable = (key: number) => {
          if (tableHeader.length > 0 || tableRows.length > 0) {
            renderedLines.push(
              <div key={`table-wrapper-${key}`} className="overflow-x-auto my-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  {tableHeader.length > 0 && (
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        {tableHeader.map((th, thIdx) => (
                          <th key={thIdx} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                            {parseInline(th)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                    {tableRows.map((row, rowIdx) => (
                      <tr key={rowIdx}>
                        {row.map((cell, cellIdx) => (
                          <td key={cellIdx} className="px-3 py-2 text-sm whitespace-normal text-gray-700 dark:text-gray-300">
                            {parseInline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
            tableHeader = [];
            tableRows = [];
            inTable = false;
          }
        };

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();

          // Handle horizontal rule
          if (line === '---' || line === '***') {
            flushList(i);
            flushTable(i);
            renderedLines.push(<hr key={i} className="my-4 border-gray-200 dark:border-gray-800" />);
            continue;
          }

          // Handle headings
          if (line.startsWith('#')) {
            flushList(i);
            flushTable(i);
            const level = line.match(/^#+/)?.[0].length || 1;
            const text = line.replace(/^#+\s*/, '');
            const HeadingTag = `h${Math.min(level, 3)}` as 'h1' | 'h2' | 'h3';
            const headingClasses = {
              h1: 'text-lg md:text-xl font-bold font-display mt-4 mb-2 text-gray-900 dark:text-white border-b pb-1 border-gray-100 dark:border-gray-800',
              h2: 'text-md md:text-lg font-semibold font-display mt-3 mb-2 text-gray-900 dark:text-white',
              h3: 'text-sm md:text-md font-semibold font-display mt-2 mb-1 text-gray-800 dark:text-gray-200',
            }[HeadingTag];

            renderedLines.push(
              <HeadingTag key={i} className={headingClasses}>
                {parseInline(text)}
              </HeadingTag>
            );
            continue;
          }

          // Handle lists (bullet points)
          if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
            flushTable(i);
            if (!inList || isNumbered) {
              flushList(i);
              inList = true;
              isNumbered = false;
            }
            listItems.push(line.substring(2));
            continue;
          }

          // Handle numbered lists
          if (/^\d+\.\s/.test(line)) {
            flushTable(i);
            if (!inList || !isNumbered) {
              flushList(i);
              inList = true;
              isNumbered = true;
            }
            listItems.push(line.replace(/^\d+\.\s*/, ''));
            continue;
          }

          // Handle tables (lines with pipe characters)
          if (line.startsWith('|') && line.endsWith('|')) {
            flushList(i);
            inTable = true;
            // Split cells and clean padding
            const cells = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
            
            // Check if separator line
            const isSeparator = cells.every(c => c.startsWith(':') || c.startsWith('-') || c.endsWith(':'));
            if (isSeparator) {
              continue;
            }

            if (tableHeader.length === 0 && tableRows.length === 0) {
              tableHeader = cells;
            } else {
              tableRows.push(cells);
            }
            continue;
          }

          // Blockquote
          if (line.startsWith('>')) {
            flushList(i);
            flushTable(i);
            const text = line.substring(1).trim();
            renderedLines.push(
              <blockquote key={i} className="border-l-4 border-blue-500 pl-3 italic text-gray-600 dark:text-gray-400 my-2">
                {parseInline(text)}
              </blockquote>
            );
            continue;
          }

          // Regular paragraph or line break
          if (line === '') {
            flushList(i);
            flushTable(i);
            continue;
          }

          // If we reached here and were in list/table, they have ended
          flushList(i);
          flushTable(i);

          renderedLines.push(
            <p key={i} className="leading-relaxed text-gray-700 dark:text-gray-300">
              {parseInline(line)}
            </p>
          );
        }

        // Flush any remaining lists or tables
        flushList(lines.length);
        flushTable(lines.length);

        return <React.Fragment key={index}>{renderedLines}</React.Fragment>;
      })}
    </div>
  );
}

// Parse bold (`**text**`), code (`code`), and italic (`_text_`) inline patterns
function parseInline(text: string): React.ReactNode[] {
  if (!text) return [];

  // Match bold, inline code, and links
  const regex = /(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\))/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-semibold text-gray-900 dark:text-white">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index} className="bg-gray-100 dark:bg-gray-850 px-1 py-0.5 rounded text-red-500 dark:text-red-400 font-mono text-xs font-semibold">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('[') && part.includes('](')) {
      const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
      if (linkMatch) {
        const linkText = linkMatch[1];
        const linkUrl = linkMatch[2];
        return (
          <a
            key={index}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300 font-medium break-all"
          >
            {linkText}
          </a>
        );
      }
    }
    return part;
  });
}
