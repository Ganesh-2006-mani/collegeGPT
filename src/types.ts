export interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'admin';
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  confidenceScore?: number;
  timestamp: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  createdBy: string;
  createdAt: string;
}

export interface DocumentInfo {
  id: string;
  name: string;
  category: string;
  uploadDate: string;
  status: 'processed' | 'failed';
  chunkCount: number;
}

export interface AdminLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface AnalyticsData {
  usersCount: number;
  studentsCount: number;
  adminsCount: number;
  docsCount: number;
  faqsCount: number;
  chatsCount: number;
  messageCount: number;
  avgConfidence: number;
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
}
