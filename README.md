# CollegeGPT - Modern Full-Stack AI College Chatbot

CollegeGPT is an intelligent, professional, and fully responsive AI university assistant. It is designed to assist students, administrators, faculty, and prospective visitors by answering college-related questions grounded directly in institutional policies, FAQs, and parsed PDF guidelines using the state-of-the-art Google Gemini API.

---

## Key Achievements & Architectures

1. **Dual Portal Dashboards**:
   - **Student Dashboard**: Offers a fluid, real-time ChatGPT-like conversation terminal, direct access to popular FAQs, browser-native Text-To-Speech (audio narration) and Voice Dictation, alongside an interactive PDF Uploader for temporary session grounding.
   - **Admin Desk**: Provides rich analytics metrics (user tracking, message volume, average model confidence scores, and real-time conversation sentiment analyzers), CRUD FAQ builders, persistent knowledge base PDF grounding, and detailed action audit logs.
2. **True Semantic Search Engine**: Generates semantic vector embeddings for institutional documents and FAQ records using the `gemini-embedding-2-preview` model. Query inputs are mapped in real-time, executing vector cosine similarity comparisons in-memory for precise, contextualized AI grounding.
3. **Graceful Failures & Resilience**: Implements an automatic local token-overlap keyword fallback search mechanism if no `GEMINI_API_KEY` is present or if API throttles occur, guaranteeing 100% operational uptime.
4. **Resilient Session Guards**: Implements SHA-256 custom Authorization Headers instead of third-party cookies, bypassing browser iframe sandbox restrictions and ensuring a stable, infinite session experience inside the AI Studio frame.

---

## Project Folder Structure

```
├── /data/                  # Local persistence directory
│   └── database.json       # Atomic, pre-seeded JSON databases
├── /server/                # Server-side full-stack modules
│   ├── db.ts               # Database controllers & seed scripts
│   └── gemini.ts           # Google GenAI SDK interface & vector search
├── /src/                   # Frontend React + TypeScript application
│   ├── components/
│   │   ├── AdminDashboard.tsx   # Admin dashboard, FAQ forms & logs
│   │   ├── StudentDashboard.tsx # Chat interface, Speech, PDF Analyzer
│   │   ├── AuthScreens.tsx      # Secure Login, Register, & Forgot password
│   │   └── MarkdownRenderer.tsx # High-fidelity custom markdown compiler
│   ├── types.ts            # Frontend TypeScript models
│   ├── App.tsx             # Routing controller
│   ├── index.css           # Global typography styles & imports
│   └── main.tsx            # React bootstrap index
├── .env.example            # Environment variables configuration guide
├── metadata.json           # Application descriptor metadata
├── package.json            # Node.js and script descriptors
├── requirements.txt        # Supplementary Python dependencies
├── tsconfig.json           # TS compiler rules
└── vite.config.ts          # Vite compiler config
```

---

## Seeding & Default Credentials

To simplify development and testing, CollegeGPT auto-seeds itself on initial boot with sample FAQs (concerning undergraduate admissions, tuition structures, scholarships, hostel standards, exams passing marks, and career placements) and the following default portals:

- **Student Portal**:
  - **Email**: `student@college.edu`
  - **Password**: `student123`
- **Admin Desk**:
  - **Email**: `admin@college.edu`
  - **Password**: `admin123`

---

## Installation & Local Execution Guide

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)

### Step 1: Clone and Set Up Environment
Copy `.env.example` to `.env` and assign your Google Gemini API Key:
```bash
cp .env.example .env
```
Ensure your `.env` contains:
```env
GEMINI_API_KEY="YOUR_ACTUAL_GEMINI_API_KEY"
```

### Step 2: Install Base Dependencies
```bash
npm install
```

### Step 3: Run in Development Mode
Starts the full-stack Node server and Vite dev-middleware proxy on port 3000:
```bash
npm run dev
```

### Step 4: Build & Start in Production Mode
```bash
npm run build
npm run start
```
The compiled server is bundled inside `dist/server.cjs` and runs with optimized assets.
