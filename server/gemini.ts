import { GoogleGenAI, Type } from "@google/genai";
import { db, FAQ, Document } from "./db";

// Lazy-initialized Gemini client with aistudio-build telemetry header
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY environment variable is not set. Running in local fallback mode.");
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Cosine Similarity helper
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let mA = 0;
  let mB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    mA += a[i] * a[i];
    mB += b[i] * b[i];
  }
  if (mA === 0 || mB === 0) return 0;
  return dotProduct / (Math.sqrt(mA) * Math.sqrt(mB));
}

// Basic text keyword similarity fallback
function keywordSimilarity(text: string, query: string): number {
  const tWords = new Set(text.toLowerCase().match(/\w+/g) || []);
  const qWords = new Set(query.toLowerCase().match(/\w+/g) || []);
  if (qWords.size === 0) return 0;
  let intersect = 0;
  for (const w of qWords) {
    if (tWords.has(w)) intersect++;
  }
  return intersect / Math.max(1, qWords.size);
}

// Generate Embeddings for indexing or queries
export async function getEmbedding(text: string): Promise<number[] | null> {
  const client = getGeminiClient();
  if (!client) return null;

  try {
    const response: any = await client.models.embedContent({
      model: "gemini-embedding-2-preview",
      contents: text
    });
    if (response.embedding?.values) {
      return response.embedding.values;
    }
  } catch (error) {
    console.error("Embedding generation failed, falling back:", error);
  }
  return null;
}

export interface SearchResult {
  text: string;
  source: string;
  category: string;
  score: number;
}

// Semantic + Keyword Hybrid Search across FAQs and Documents
export async function searchContext(query: string): Promise<SearchResult[]> {
  const queryEmbedding = await getEmbedding(query);
  const results: SearchResult[] = [];

  // 1. Search FAQs
  const faqs = db.getFAQs();
  for (const faq of faqs) {
    let score = 0;
    if (queryEmbedding && faq.embedding) {
      score = cosineSimilarity(queryEmbedding, faq.embedding);
    } else {
      score = keywordSimilarity(faq.question + " " + faq.answer, query);
    }
    results.push({
      text: `FAQ Question: ${faq.question}\nAnswer: ${faq.answer}`,
      source: "FAQ Database",
      category: faq.category,
      score: score
    });
  }

  // 2. Search Documents
  const docs = db.getDocuments();
  for (const doc of docs) {
    for (let i = 0; i < doc.chunks.length; i++) {
      const chunk = doc.chunks[i];
      let score = 0;
      if (queryEmbedding && chunk.embedding) {
        score = cosineSimilarity(queryEmbedding, chunk.embedding);
      } else {
        score = keywordSimilarity(chunk.text, query);
      }
      results.push({
        text: chunk.text,
        source: `Document: ${doc.name}`,
        category: doc.category,
        score: score
      });
    }
  }

  // Sort by score descending and return top 5
  return results.sort((a, b) => b.score - a.score).slice(0, 5);
}

export interface CollegeResponse {
  answer: string;
  confidenceScore: number;
  sentiment: 'positive' | 'neutral' | 'negative';
}

// Query college assistant with context
export async function askCollegeGPT(
  userId: string,
  history: { role: 'user' | 'model'; content: string }[],
  userRole: string,
  temporaryDocContext?: string
): Promise<CollegeResponse> {
  const client = getGeminiClient();
  const lastUserMessage = history[history.length - 1]?.content || "";

  // Perform semantic search
  const retrievedResults = await searchContext(lastUserMessage);
  
  // Format retrieved context
  let contextText = retrievedResults
    .filter(r => r.score > 0.15 || !process.env.GEMINI_API_KEY) // lower threshold for low matching, but keep relevant
    .map(r => `[Source: ${r.source}] [Category: ${r.category}] (Relevance Score: ${r.score.toFixed(2)})\n${r.text}`)
    .join("\n\n");

  if (temporaryDocContext) {
    contextText = `[User's Temporary Uploaded Document Context]\n${temporaryDocContext}\n\n` + contextText;
  }

  const systemInstruction = `You are CollegeGPT, the highly intelligent, professional, and empathetic official AI assistant of our college.
Your primary role is to provide accurate, helpful, and polite answers to students, faculty, staff, parents, and visitors.
The current user is logged in with the role of: "${userRole}".
You are provided with relevant institutional knowledge, policies, and FAQs retrieved via a semantic search engine.

Institutional Knowledge Base Context:
---
${contextText || "No matching institutional documentation was found."}
---

Rules of Engagement:
1. Always base your response directly on the provided context if possible.
2. If the context contains the answer, summarize and answer beautifully, with polite greetings or thanks handled naturally.
3. If the answer is not in the context, but is general common educational knowledge, you can provide an educational response, but clearly state that it is general guidance and recommend contacting administration for official college policy.
4. If you have no information or if the query is unrelated, politely state that you do not have verified details on this topic. Provide general helpful recommendations to contact administrative support.
5. Never fabricate dates, emails, phone numbers, or fees.
6. Provide output structured STRICTLY in JSON format matching the schema requested below. Do not wrap in markdown or any other tags.

You must respond with a JSON object containing:
- answer: A detailed, conversational, and well-structured answer formatted in elegant markdown. You can use markdown bullet points, tables, bold text, or code blocks where relevant.
- confidenceScore: A floating-point number between 0.0 and 1.0 indicating how confident you are that the provided answer is verified and correct based on the context.
- sentiment: Analysis of the user's input sentiment ('positive', 'neutral', 'negative').`;

  if (!client) {
    // If Gemini key is missing, return fallback response
    const topMatch = retrievedResults[0];
    const answer = topMatch && topMatch.score > 0.2
      ? `[Local Fallback Mode - No API Key Set]\n\nBased on our FAQs:\n\n${topMatch.text}`
      : `[Local Fallback Mode - No API Key Set]\n\nHello! I am CollegeGPT. To unlock full AI features, please set your \`GEMINI_API_KEY\` in the Secrets panel.\n\nHere is a list of frequently asked questions I can help you with:\n\n${db.getFAQs().map(f => `- **${f.question}**`).join("\n")}`;

    return {
      answer: answer,
      confidenceScore: topMatch && topMatch.score > 0.2 ? 0.7 : 0.4,
      sentiment: 'neutral'
    };
  }

  try {
    const contents = history.map(h => ({
      role: h.role,
      parts: [{ text: h.content }]
    }));

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            answer: {
              type: Type.STRING,
              description: "The college chatbot's response in markdown formatting."
            },
            confidenceScore: {
              type: Type.NUMBER,
              description: "Confidence rating of the answer accuracy between 0.0 and 1.0."
            },
            sentiment: {
              type: Type.STRING,
              description: "Sentiment of the user message ('positive', 'neutral', or 'negative')."
            }
          },
          required: ["answer", "confidenceScore", "sentiment"]
        }
      }
    });

    if (response.text) {
      const parsed: CollegeResponse = JSON.parse(response.text);
      return parsed;
    }
  } catch (error) {
    console.error("Gemini AI API execution failed:", error);
  }

  // Fallback in case of call errors
  const topMatch = retrievedResults[0];
  return {
    answer: topMatch && topMatch.score > 0.15
      ? `I found the following matching record in our knowledge base:\n\n${topMatch.text}`
      : "I apologize, but I am currently having difficulty connecting to my AI core. Please try again in a moment, or contact the university support desk.",
    confidenceScore: 0.5,
    sentiment: 'neutral'
  };
}
