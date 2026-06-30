import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';

const requireFn = typeof require !== 'undefined' ? require : createRequire(import.meta.url);
const pdf = requireFn('pdf-parse');

import { db, hashPassword, User, Document, FAQ, ChatSession, AdminLog } from './server/db';
import { askCollegeGPT, getEmbedding, SearchResult } from './server/gemini';

// In-memory session store (safe for iframe environments)
const sessions = new Map<string, { userId: string; role: 'student' | 'admin'; name: string }>();

// Simple Express App
const app = express();
const PORT = 3000;

// Configure body parsing with generous limits for PDF uploads
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// Authentication Middleware
interface AuthenticatedRequest extends express.Request {
  user?: {
    id: string;
    email: string;
    role: 'student' | 'admin';
    name: string;
  };
}

const authenticate = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    res.status(401).json({ error: 'Authorization header is missing' });
    return;
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const session = sessions.get(token);

  if (!session) {
    res.status(401).json({ error: 'Invalid or expired session' });
    return;
  }

  const user = db.getUserById(session.userId);
  if (!user) {
    res.status(401).json({ error: 'User associated with session not found' });
    return;
  }

  req.user = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name
  };
  next();
};

const adminOnly = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Access forbidden: Administrator privileges required' });
    return;
  }
  next();
};

// -----------------------------------------------------------------------------
// AUTHENTICATION ENDPOINTS
// -----------------------------------------------------------------------------

app.post('/api/auth/register', (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ error: 'Name, email, and password are required' });
    return;
  }

  const existing = db.getUserByEmail(email);
  if (existing) {
    res.status(400).json({ error: 'A user with this email already exists' });
    return;
  }

  const userRole = role === 'admin' ? 'admin' : 'student';

  const newUser: User = {
    id: 'u_' + crypto.randomBytes(8).toString('hex'),
    email: email.toLowerCase().trim(),
    name: name.trim(),
    passwordHash: hashPassword(password),
    role: userRole,
    createdAt: new Date().toISOString()
  };

  db.addUser(newUser);

  // Log registration if admin
  if (userRole === 'admin') {
    db.addAdminLog({
      id: 'l_' + crypto.randomBytes(8).toString('hex'),
      adminId: newUser.id,
      adminName: newUser.name,
      action: 'Administrator Registration',
      details: `New administrator account registered for ${newUser.email}`,
      timestamp: new Date().toISOString()
    });
  }

  res.status(201).json({ message: 'User registered successfully' });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = db.getUserByEmail(email);
  if (!user || user.passwordHash !== hashPassword(password)) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = 'tok_' + crypto.randomBytes(24).toString('hex');
  sessions.set(token, {
    userId: user.id,
    role: user.role,
    name: user.name
  });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    }
  });
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '').trim();
    sessions.delete(token);
  }
  res.json({ success: true });
});

app.post('/api/auth/change-password', authenticate, (req: AuthenticatedRequest, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    res.status(400).json({ error: 'Current password and new password are required' });
    return;
  }

  const user = db.getUserById(req.user!.id);
  if (!user || user.passwordHash !== hashPassword(oldPassword)) {
    res.status(400).json({ error: 'Incorrect current password' });
    return;
  }

  db.updateUser(user.id, { passwordHash: hashPassword(newPassword) });
  res.json({ message: 'Password updated successfully' });
});

app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  const user = db.getUserByEmail(email);
  if (!user) {
    res.status(404).json({ error: 'No account registered with this email address' });
    return;
  }

  // Simulate resetting password (since this is an applet, generate a temporary password reset code)
  const resetCode = crypto.randomBytes(4).toString('hex').toUpperCase();
  res.json({
    message: `A password reset code has been generated. For testing, your verification code is: ${resetCode}`,
    resetCode: resetCode
  });
});

app.get('/api/auth/me', authenticate, (req: AuthenticatedRequest, res) => {
  res.json({ user: req.user });
});

// -----------------------------------------------------------------------------
// CHAT SESSION & CONVERSATION ENDPOINTS
// -----------------------------------------------------------------------------

app.get('/api/chats', authenticate, (req: AuthenticatedRequest, res) => {
  const userChats = db.getChatsByUser(req.user!.id);
  res.json(userChats);
});

app.post('/api/chats/new', authenticate, (req: AuthenticatedRequest, res) => {
  const { title } = req.body;
  const newSession: ChatSession = {
    id: 'chat_' + crypto.randomBytes(8).toString('hex'),
    userId: req.user!.id,
    title: title || 'New Chat Session',
    messages: [
      {
        role: 'model',
        content: `Hello ${req.user!.name}! Welcome to CollegeGPT. I am your friendly AI college assistant. Ask me anything about admissions, courses, placement statistics, exams, hostel life, or scholarships!`,
        timestamp: new Date().toISOString()
      }
    ],
    timestamp: new Date().toISOString()
  };

  db.addChat(newSession);
  res.status(201).json(newSession);
});

app.get('/api/chats/:id', authenticate, (req: AuthenticatedRequest, res) => {
  const chat = db.getChatById(req.params.id);
  if (!chat || chat.userId !== req.user!.id) {
    res.status(404).json({ error: 'Chat session not found' });
    return;
  }
  res.json(chat);
});

app.post('/api/chats/:id/message', authenticate, async (req: AuthenticatedRequest, res) => {
  const chat = db.getChatById(req.params.id);
  if (!chat || chat.userId !== req.user!.id) {
    res.status(404).json({ error: 'Chat session not found' });
    return;
  }

  const { message, temporaryDocContext } = req.body;
  if (!message) {
    res.status(400).json({ error: 'Message content is empty' });
    return;
  }

  // Push user message
  chat.messages.push({
    role: 'user',
    content: message,
    timestamp: new Date().toISOString()
  });

  // Call CollegeGPT logic
  const responseData = await askCollegeGPT(
    req.user!.id,
    chat.messages.map(m => ({ role: m.role, content: m.content })),
    req.user!.role,
    temporaryDocContext
  );

  // Push response message
  chat.messages.push({
    role: 'model',
    content: responseData.answer,
    timestamp: new Date().toISOString()
  });

  // Update chat session with sentiment & metadata
  chat.sentiment = responseData.sentiment;
  chat.confidenceScore = responseData.confidenceScore;
  chat.timestamp = new Date().toISOString();

  db.updateChat(chat.id, {
    messages: chat.messages,
    sentiment: chat.sentiment,
    confidenceScore: chat.confidenceScore,
    timestamp: chat.timestamp
  });

  res.json({
    chat,
    newMessage: chat.messages[chat.messages.length - 1],
    confidenceScore: responseData.confidenceScore,
    sentiment: responseData.sentiment
  });
});

app.post('/api/chats/:id/regenerate', authenticate, async (req: AuthenticatedRequest, res) => {
  const chat = db.getChatById(req.params.id);
  if (!chat || chat.userId !== req.user!.id) {
    res.status(404).json({ error: 'Chat session not found' });
    return;
  }

  // Remove the last model message if it exists
  if (chat.messages.length > 1 && chat.messages[chat.messages.length - 1].role === 'model') {
    chat.messages.pop();
  } else {
    res.status(400).json({ error: 'No message to regenerate' });
    return;
  }

  const { temporaryDocContext } = req.body;

  // Ask CollegeGPT again
  const responseData = await askCollegeGPT(
    req.user!.id,
    chat.messages.map(m => ({ role: m.role, content: m.content })),
    req.user!.role,
    temporaryDocContext
  );

  chat.messages.push({
    role: 'model',
    content: responseData.answer,
    timestamp: new Date().toISOString()
  });

  chat.sentiment = responseData.sentiment;
  chat.confidenceScore = responseData.confidenceScore;
  chat.timestamp = new Date().toISOString();

  db.updateChat(chat.id, {
    messages: chat.messages,
    sentiment: chat.sentiment,
    confidenceScore: chat.confidenceScore,
    timestamp: chat.timestamp
  });

  res.json({
    chat,
    newMessage: chat.messages[chat.messages.length - 1],
    confidenceScore: responseData.confidenceScore,
    sentiment: responseData.sentiment
  });
});

app.post('/api/chats/:id/feedback', authenticate, (req: AuthenticatedRequest, res) => {
  const chat = db.getChatById(req.params.id);
  if (!chat || chat.userId !== req.user!.id) {
    res.status(404).json({ error: 'Chat session not found' });
    return;
  }

  const { feedback } = req.body; // 'like' | 'dislike' | null
  // Just log feedback inside the chat for analytics or logs
  res.json({ success: true, message: 'Feedback submitted successfully' });
});

app.delete('/api/chats/:id', authenticate, (req: AuthenticatedRequest, res) => {
  const chat = db.getChatById(req.params.id);
  if (!chat || chat.userId !== req.user!.id) {
    res.status(404).json({ error: 'Chat session not found' });
    return;
  }

  db.deleteChat(req.params.id);
  res.json({ success: true, message: 'Chat deleted successfully' });
});

app.delete('/api/chats', authenticate, (req: AuthenticatedRequest, res) => {
  db.clearChatsByUser(req.user!.id);
  res.json({ success: true, message: 'All conversations cleared' });
});

// -----------------------------------------------------------------------------
// FAQ ADMINISTRATION ENDPOINTS
// -----------------------------------------------------------------------------

app.get('/api/faqs', (req, res) => {
  res.json(db.getFAQs());
});

app.post('/api/faqs', authenticate, adminOnly, async (req: AuthenticatedRequest, res) => {
  const { question, answer, category } = req.body;
  if (!question || !answer || !category) {
    res.status(400).json({ error: 'Question, answer, and category are required' });
    return;
  }

  // Generate embedding
  const embedding = await getEmbedding(question + " " + answer) || undefined;

  const newFAQ: FAQ = {
    id: 'faq_' + crypto.randomBytes(8).toString('hex'),
    question: question.trim(),
    answer: answer.trim(),
    category: category.trim(),
    createdBy: req.user!.id,
    createdAt: new Date().toISOString(),
    embedding
  };

  db.addFAQ(newFAQ);

  // Add Log
  db.addAdminLog({
    id: 'l_' + crypto.randomBytes(8).toString('hex'),
    adminId: req.user!.id,
    adminName: req.user!.name,
    action: 'Create FAQ',
    details: `Added new FAQ in ${category}: "${question.substring(0, 40)}..."`,
    timestamp: new Date().toISOString()
  });

  res.status(201).json(newFAQ);
});

app.put('/api/faqs/:id', authenticate, adminOnly, async (req: AuthenticatedRequest, res) => {
  const { question, answer, category } = req.body;
  const faq = db.getFAQById(req.params.id);
  if (!faq) {
    res.status(404).json({ error: 'FAQ not found' });
    return;
  }

  const updates: Partial<FAQ> = {};
  if (question) updates.question = question.trim();
  if (answer) updates.answer = answer.trim();
  if (category) updates.category = category.trim();

  // If text changed, regenerate embedding
  if (question || answer) {
    const textToEmbed = (question || faq.question) + " " + (answer || faq.answer);
    updates.embedding = await getEmbedding(textToEmbed) || undefined;
  }

  db.updateFAQ(faq.id, updates);

  db.addAdminLog({
    id: 'l_' + crypto.randomBytes(8).toString('hex'),
    adminId: req.user!.id,
    adminName: req.user!.name,
    action: 'Update FAQ',
    details: `Modified FAQ: "${(question || faq.question).substring(0, 40)}..."`,
    timestamp: new Date().toISOString()
  });

  res.json({ success: true, faq: db.getFAQById(faq.id) });
});

app.delete('/api/faqs/:id', authenticate, adminOnly, (req: AuthenticatedRequest, res) => {
  const faq = db.getFAQById(req.params.id);
  if (!faq) {
    res.status(404).json({ error: 'FAQ not found' });
    return;
  }

  db.deleteFAQ(req.params.id);

  db.addAdminLog({
    id: 'l_' + crypto.randomBytes(8).toString('hex'),
    adminId: req.user!.id,
    adminName: req.user!.name,
    action: 'Delete FAQ',
    details: `Deleted FAQ: "${faq.question.substring(0, 40)}..."`,
    timestamp: new Date().toISOString()
  });

  res.json({ success: true, message: 'FAQ deleted successfully' });
});

// -----------------------------------------------------------------------------
// DOCUMENT ADMINISTRATION / PDF PARSING ENDPOINTS
// -----------------------------------------------------------------------------

app.get('/api/documents', authenticate, (req: AuthenticatedRequest, res) => {
  // Allow all logged-in users to see processed documents, but only admins see uploadedBy, etc.
  const docs = db.getDocuments().map(d => ({
    id: d.id,
    name: d.name,
    category: d.category,
    uploadDate: d.uploadDate,
    status: d.status,
    chunkCount: d.chunks.length
  }));
  res.json(docs);
});

// Parse, Chunk, and Embed PDF upload
app.post('/api/documents/upload', authenticate, async (req: AuthenticatedRequest, res) => {
  const { name, category, fileBase64, isTemporary } = req.body;

  if (!name || !category || !fileBase64) {
    res.status(400).json({ error: 'Document name, category, and PDF file data are required' });
    return;
  }

  try {
    // 1. Decode PDF from base64
    const buffer = Buffer.from(fileBase64, 'base64');
    
    // 2. Parse text from buffer
    const parsedData = await pdf(buffer);
    const textContent = parsedData.text || "";

    if (!textContent.trim()) {
      res.status(400).json({ error: 'No readable text content could be extracted from the PDF.' });
      return;
    }

    // 3. Chunk text (overlapping chunks of ~800 chars)
    const chunkSize = 800;
    const overlap = 150;
    const chunks: { text: string; embedding?: number[] }[] = [];

    let index = 0;
    while (index < textContent.length) {
      const chunkText = textContent.substring(index, index + chunkSize).trim();
      if (chunkText.length > 50) {
        // Generate embedding for chunk
        let embedding: number[] | undefined;
        try {
          embedding = await getEmbedding(chunkText) || undefined;
        } catch (embErr) {
          console.error("Failed chunk embedding:", embErr);
        }
        chunks.push({ text: chunkText, embedding });
      }
      index += (chunkSize - overlap);
    }

    // If there is very little text, create at least 1 chunk
    if (chunks.length === 0 && textContent.trim().length > 0) {
      chunks.push({ text: textContent.trim() });
    }

    if (isTemporary) {
      // Return extracted text context directly for temp student analysis
      res.json({
        message: 'Temporary document analyzed successfully.',
        textContext: textContent,
        chunkCount: chunks.length,
        characterCount: textContent.length
      });
      return;
    }

    // Save as persistent college document (requires Admin privileges)
    if (req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Only administrators can save persistent knowledge base documents.' });
      return;
    }

    const newDoc: Document = {
      id: 'doc_' + crypto.randomBytes(8).toString('hex'),
      name: name.trim(),
      textContent: textContent,
      chunks: chunks,
      category: category.trim(),
      uploadDate: new Date().toISOString(),
      uploadedBy: req.user!.id,
      status: 'processed'
    };

    db.addDocument(newDoc);

    // Log admin action
    db.addAdminLog({
      id: 'l_' + crypto.randomBytes(8).toString('hex'),
      adminId: req.user!.id,
      adminName: req.user!.name,
      action: 'Upload Knowledge PDF',
      details: `Uploaded & processed document: "${name}" (${chunks.length} semantic chunks)`,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      id: newDoc.id,
      name: newDoc.name,
      category: newDoc.category,
      chunkCount: chunks.length,
      uploadDate: newDoc.uploadDate
    });

  } catch (error: any) {
    console.error("PDF Upload & Parsing Error:", error);
    res.status(500).json({ error: `Failed to process PDF document: ${error.message || error}` });
  }
});

app.delete('/api/documents/:id', authenticate, adminOnly, (req: AuthenticatedRequest, res) => {
  const doc = db.getDocumentById(req.params.id);
  if (!doc) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }

  db.deleteDocument(req.params.id);

  db.addAdminLog({
    id: 'l_' + crypto.randomBytes(8).toString('hex'),
    adminId: req.user!.id,
    adminName: req.user!.name,
    action: 'Delete Knowledge PDF',
    details: `Deleted document: "${doc.name}"`,
    timestamp: new Date().toISOString()
  });

  res.json({ success: true, message: 'Document deleted successfully from knowledge base' });
});

// -----------------------------------------------------------------------------
// ADMIN ANALYTICS & LOGS
// -----------------------------------------------------------------------------

app.get('/api/admin/logs', authenticate, adminOnly, (req, res) => {
  res.json(db.getAdminLogs());
});

app.get('/api/admin/analytics', authenticate, adminOnly, (req, res) => {
  const users = db.getUsers();
  const docs = db.getDocuments();
  const faqs = db.getFAQs();
  const chats = db.getAllChats();

  // Sentiment distribution
  let positive = 0;
  let neutral = 0;
  let negative = 0;
  let scoreSum = 0;
  let scoredChatCount = 0;

  chats.forEach(c => {
    if (c.sentiment === 'positive') positive++;
    else if (c.sentiment === 'negative') negative++;
    else neutral++;

    if (c.confidenceScore) {
      scoreSum += c.confidenceScore;
      scoredChatCount++;
    }
  });

  const avgConfidence = scoredChatCount > 0 ? (scoreSum / scoredChatCount) : 0.85;

  res.json({
    usersCount: users.length,
    studentsCount: users.filter(u => u.role === 'student').length,
    adminsCount: users.filter(u => u.role === 'admin').length,
    docsCount: docs.length,
    faqsCount: faqs.length,
    chatsCount: chats.length,
    messageCount: chats.reduce((sum, c) => sum + c.messages.length, 0),
    avgConfidence: parseFloat(avgConfidence.toFixed(2)),
    sentiment: {
      positive,
      neutral: neutral + (chats.length === 0 ? 1 : 0), // pad with default
      negative
    }
  });
});

// -----------------------------------------------------------------------------
// BOOTSTRAP EXPRESS SERVER & VITE COMPATIBILITY
// -----------------------------------------------------------------------------

async function startServer() {
  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CollegeGPT Server] Running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start CollegeGPT backend server:", err);
});
