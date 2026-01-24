# CodeInterpreter

**AI-assisted code comprehension for real-world codebases.**

CodeInterpreter is a modern, privacy-focused tool designed to help developers, students, and engineers understand complex codebases. It combines AST-based parsing with semantic search (RAG) to provide context-aware explanations of files, functions, and cross-file dependencies.

![Project Status](https://img.shields.io/badge/Status-In_Development-yellow)
![License](https://img.shields.io/badge/License-MIT-blue)

## Features

### 🔍 Deep Code Analysis
- **Folder-Level Ingestion**: Scans entire project directories recursively.
- **Dependency Graphs**: Maps imports, exports, and symbol definitions across files.
- **AST Parsing**: Uses `java-parser`, `@typescript-eslint/typescript-estree`, and more for accurate symbol resolution.

### 🧠 AI-Powered Insights
- **Semantic Search**: Uses Google's `text-embedding-004` to find semantically relevant code chunks.
- **Context-Aware Explanations**: Generates line-by-line explanations using Gemini Flash, injected with cross-file context.
- **Confidence Scoring**: Heuristic-based scoring to filter relevant search results.

### 🛡️ Deployment Ready
- **Public Access**: Simplified for immediate deployment without forced authentication.
- **Modern Stack**: Next.js 14 (App Router), React, TailwindCSS, Prisma.

## Tech Stack

- **Frontend**: Next.js 14, React, TailwindCSS, Lucide Icons
- **Auth**: NextAuth.js v4, Prisma Adapter, Bcryptjs
- **Database**: SQLite (Local Dev) / PostgreSQL (Production)
- **AI**: Google Gemini API (Embeddings + Chat)
- **Analysis**: AST parsers for TS/JS, Java, Python

**Important Note on Deployment**:
When deployed to Vercel (or any cloud), the application **cannot access files on your local computer** (e.g., `C:\Users\...`).
- **To analyze local files**: You must run the app locally (`npm run dev`).
- **On Vercel**: You can only analyze files that are present in the cloud environment (e.g., the project's own source code via `./`).

## Getting Started

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed installation and configuration instructions.

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/Pratik-Talegaonkar/CodeInterpreter.git
   cd CodeInterpreter
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Copy `.env.local.example` to `.env.local` and add your keys.
   ```bash
   cp .env.local.example .env.local
   ```

4. **Initialize Database**
   ```bash
   npm run prisma:migrate
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) (or the port shown in terminal).

## Authentication

The project uses NextAuth.js for authentication. 

- **Local Development**: Uses SQLite (`dev.db`).
- **Production**: Recommended to use Vercel Postgres or Supabase.
- **Providers**: 
  - Email/Password (Credentials)
  - Google OAuth (optional, requires configuration)

## Deployment

This project is optimized for deployment on [Vercel](https://vercel.com).

1. Push your code to a Git repository.
2. Import the project in Vercel.
3. Add the environment variables from `.env.local` to Vercel settings.
4. **Crucial**: Update `DATABASE_URL` to point to a production PostgreSQL database.
5. Deploy!

## Disclaimer

This is a learning-focused engineering project. AI-generated explanations are probabilistic and should be verified. The tool is designed to assist human understanding, not replace it.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---
Built by Pratik Talegaonkar.
