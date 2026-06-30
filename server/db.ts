import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Helper for secure hashing
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: 'student' | 'admin';
  name: string;
  createdAt: string;
}

export interface DocumentChunk {
  text: string;
  embedding?: number[];
}

export interface Document {
  id: string;
  name: string;
  textContent: string;
  chunks: DocumentChunk[];
  category: string;
  uploadDate: string;
  uploadedBy: string;
  status: 'processed' | 'failed';
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  createdBy: string;
  createdAt: string;
  embedding?: number[];
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

export interface ChatHistoryRecord {
  id: string;
  userId: string;
  message: string;
  response: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  feedback: 'like' | 'dislike' | null;
  confidenceScore: number;
  timestamp: string;
}

export interface AdminLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  details: string;
  timestamp: string;
}

interface DatabaseSchema {
  users: User[];
  documents: Document[];
  faqs: FAQ[];
  chats: ChatSession[];
  adminLogs: AdminLog[];
}

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'database.json');

class Database {
  private data: DatabaseSchema = {
    users: [],
    documents: [],
    faqs: [],
    chats: [],
    adminLogs: []
  };

  constructor() {
    this.init();
  }

  private init() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        // Ensure all required collections exist
        if (!this.data.users) this.data.users = [];
        if (!this.data.documents) this.data.documents = [];
        if (!this.data.faqs) this.data.faqs = [];
        if (!this.data.chats) this.data.chats = [];
        if (!this.data.adminLogs) this.data.adminLogs = [];
      } catch (e) {
        console.error('Error loading database, resetting to default.', e);
        this.seedDefaults();
      }
    } else {
      this.seedDefaults();
    }
  }

  private seedDefaults() {
    console.log('Seeding default database records...');
    
    // Create Default Users
    const defaultUsers: User[] = [
      {
        id: 'u1',
        email: 'admin@college.edu',
        passwordHash: hashPassword('admin123'),
        role: 'admin',
        name: 'Dean Alice Johnson',
        createdAt: new Date().toISOString()
      },
      {
        id: 'u2',
        email: 'student@college.edu',
        passwordHash: hashPassword('student123'),
        role: 'student',
        name: 'Marcus Brody',
        createdAt: new Date().toISOString()
      }
    ];

    // Seed FAQs
    const defaultFAQs: FAQ[] = [
      {
        id: 'f1',
        question: 'What is the admission procedure for undergraduate programs?',
        answer: 'Admissions to undergraduate programs are based on academic performance and standard qualifications. You can register online through our admissions portal, upload your high school transcripts, and pay the registration fee. The deadline for Fall semester admissions is August 15th.',
        category: 'Admissions',
        createdBy: 'u1',
        createdAt: new Date().toISOString()
      },
      {
        id: 'f2',
        question: 'What is the tuition fee structure for computer science and engineering?',
        answer: 'The annual tuition fee for the B.Tech in Computer Science and Engineering is $12,000. This fee excludes hostel, mess, and laboratory deposits. Installment options and merit scholarship applications are available through the finance department.',
        category: 'Academics',
        createdBy: 'u1',
        createdAt: new Date().toISOString()
      },
      {
        id: 'f3',
        question: 'Are there any scholarships for meritorious students?',
        answer: 'Yes, we offer several scholarships: Merit Scholarships (up to 50% tuition waiver for the top 5% of students in each batch), Need-Based Financial Aid, and Special Athletic Scholarships. Applications must be submitted to the admin office by September 1st.',
        category: 'Financial Aid',
        createdBy: 'u1',
        createdAt: new Date().toISOString()
      },
      {
        id: 'f4',
        question: 'What facilities are available in the college hostels?',
        answer: 'Our campus offers separate hostels for boys and girls. Facilities include high-speed Wi-Fi, 24/7 electricity backup, common reading rooms, a fully equipped fitness gym, laundry facilities, and a hygienic mess serving three nutritious meals daily.',
        category: 'Campus Life',
        createdBy: 'u1',
        createdAt: new Date().toISOString()
      },
      {
        id: 'f5',
        question: 'What is the passing criteria for semester final examinations?',
        answer: 'To pass a course, a student must secure a minimum of 40% in the final theory examination and an overall aggregate of 50% including internal assessments (attendance, regular assignments, and mid-term assessments).',
        category: 'Examinations',
        createdBy: 'u1',
        createdAt: new Date().toISOString()
      },
      {
        id: 'f6',
        question: 'Does the college have a campus placement program?',
        answer: 'Yes! The college runs a highly active Career Development & Placement Cell. Last year, we achieved a 95% placement rate, with the highest package reaching $45,000 per annum and an average package of $9,500. Key recruiters include TechCorp, Google, Microsoft, and Global Solutions.',
        category: 'Placements',
        createdBy: 'u1',
        createdAt: new Date().toISOString()
      }
    ];

    // Seed Documents (Sample policy text)
    const defaultDocuments: Document[] = [
      {
        id: 'd1',
        name: 'Campus_General_Policies.pdf',
        textContent: 'College General Code of Conduct and Attendance Policy:\n1. Students must maintain a minimum of 75% attendance in each registered subject to be eligible to sit for the end-semester examinations.\n2. Ragging, bullying, or harassment of any form is strictly prohibited and will lead to immediate expulsion.\n3. The campus is a drug-free, smoke-free zone. Any violation will result in strict disciplinary action.\n4. Library hours are from 8:00 AM to 8:00 PM on weekdays, and 9:00 AM to 4:00 PM on Saturdays.\n5. ID cards must be worn visibly at all times when on campus grounds.',
        chunks: [
          { text: 'College General Code of Conduct and Attendance Policy:\n1. Students must maintain a minimum of 75% attendance in each registered subject to be eligible to sit for the end-semester examinations.' },
          { text: '2. Ragging, bullying, or harassment of any form is strictly prohibited and will lead to immediate expulsion.\n3. The campus is a drug-free, smoke-free zone. Any violation will result in strict disciplinary action.' },
          { text: '4. Library hours are from 8:00 AM to 8:00 PM on weekdays, and 9:00 AM to 4:00 PM on Saturdays.\n5. ID cards must be worn visibly at all times when on campus grounds.' }
        ],
        category: 'Regulations',
        uploadDate: new Date().toISOString(),
        uploadedBy: 'u1',
        status: 'processed'
      }
    ];

    const defaultLogs: AdminLog[] = [
      {
        id: 'l1',
        adminId: 'u1',
        adminName: 'Dean Alice Johnson',
        action: 'Database Initialization',
        details: 'System database seeded with standard FAQs and default policies.',
        timestamp: new Date().toISOString()
      }
    ];

    this.data = {
      users: defaultUsers,
      documents: defaultDocuments,
      faqs: defaultFAQs,
      chats: [],
      adminLogs: defaultLogs
    };

    this.save();
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error writing to database file:', e);
    }
  }

  // User Operations
  getUsers(): User[] {
    return this.data.users;
  }

  getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  getUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  addUser(user: User) {
    this.data.users.push(user);
    this.save();
  }

  updateUser(id: string, updates: Partial<User>) {
    const user = this.getUserById(id);
    if (user) {
      Object.assign(user, updates);
      this.save();
    }
  }

  deleteUser(id: string) {
    this.data.users = this.data.users.filter(u => u.id !== id);
    this.save();
  }

  // Documents Operations
  getDocuments(): Document[] {
    return this.data.documents;
  }

  getDocumentById(id: string): Document | undefined {
    return this.data.documents.find(d => d.id === id);
  }

  addDocument(doc: Document) {
    this.data.documents.push(doc);
    this.save();
  }

  deleteDocument(id: string) {
    this.data.documents = this.data.documents.filter(d => d.id !== id);
    this.save();
  }

  // FAQs Operations
  getFAQs(): FAQ[] {
    return this.data.faqs;
  }

  getFAQById(id: string): FAQ | undefined {
    return this.data.faqs.find(f => f.id === id);
  }

  addFAQ(faq: FAQ) {
    this.data.faqs.push(faq);
    this.save();
  }

  updateFAQ(id: string, updates: Partial<FAQ>) {
    const faq = this.getFAQById(id);
    if (faq) {
      Object.assign(faq, updates);
      this.save();
    }
  }

  deleteFAQ(id: string) {
    this.data.faqs = this.data.faqs.filter(f => f.id !== id);
    this.save();
  }

  // Chats Operations
  getChatsByUser(userId: string): ChatSession[] {
    return this.data.chats.filter(c => c.userId === userId);
  }

  getChatById(id: string): ChatSession | undefined {
    return this.data.chats.find(c => c.id === id);
  }

  addChat(chat: ChatSession) {
    this.data.chats.push(chat);
    this.save();
  }

  updateChat(id: string, updates: Partial<ChatSession>) {
    const chat = this.getChatById(id);
    if (chat) {
      Object.assign(chat, updates);
      this.save();
    }
  }

  deleteChat(id: string) {
    this.data.chats = this.data.chats.filter(c => c.id !== id);
    this.save();
  }

  clearChatsByUser(userId: string) {
    this.data.chats = this.data.chats.filter(c => c.userId !== userId);
    this.save();
  }

  getAllChats(): ChatSession[] {
    return this.data.chats;
  }

  // Admin Logs Operations
  getAdminLogs(): AdminLog[] {
    return this.data.adminLogs;
  }

  addAdminLog(log: AdminLog) {
    this.data.adminLogs.unshift(log); // Newer first
    this.save();
  }
}

export const db = new Database();
