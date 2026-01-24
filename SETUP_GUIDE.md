# Setup Guide

This guide covers the configuration required to run CodeInterpreter locally and prepare it for production.

## 1. Environment Variables

Create a `.env.local` file in the root directory.

```bash
cp .env.local.example .env.local
```

### Required Variables

| Variable | Description | Example / Instructions |
|----------|-------------|------------------------|
| `DATABASE_URL` | Connection string for Prisma | `file:./dev.db` (Local) / `postgresql://...` (Prod) |
| `NEXTAUTH_URL` | URL of your site | `http://localhost:3002` (Local) / `https://your-site.com` (Prod) |
| `NEXTAUTH_SECRET` | Secret for session encryption | Generate: `openssl rand -base64 32` |
| `GEMINI_API_KEY` | Google AI API Key | Get from [Google AI Studio](https://makersuite.google.com/app/apikey) |

### Optional Variables (Google OAuth)

| Variable | Description | Instructions |
|----------|-------------|--------------|
| `GOOGLE_CLIENT_ID` | OAuth Client ID | Google Cloud Console > APIs & Services > Credentials |
| `GOOGLE_CLIENT_SECRET` | OAuth Client Secret | Google Cloud Console > APIs & Services > Credentials |
| `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED` | Toggle for UI | Set to `true` to enable the button |

## 2. Database Setup

We use **Prisma** with **SQLite** for local development.

1. **Generate Prisma Client**
   ```bash
   npm run prisma:generate
   ```

2. **Run Migrations** (Creates `dev.db`)
   ```bash
   npm run prisma:migrate
   ```

3. **View Data** (Optional)
   ```bash
   npm run prisma:studio
   ```

## 3. Google OAuth Configuration (Optional)

To enable "Continue with Google":

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project.
3. Enable the **Google+ API** or **Google People API**.
4. Go to **Credentials** -> **Create Credentials** -> **OAuth Client ID**.
5. Application Type: **Web application**.
6. **Authorized JavaScript origins**:
   - `http://localhost:3002` (adjust port if needed)
   - `https://your-production-domain.com`
7. **Authorized redirect URIs**:
   - `http://localhost:3002/api/auth/callback/google`
   - `https://your-production-domain.com/api/auth/callback/google`
8. Copy the Client ID and Secret to `.env.local`.
9. Set `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=true` in `.env.local`.

## 4. Production Deployment

### Database
SQLite is **not recommended** for serverless deployments (like Vercel) because the filesystem is ephemeral. Use a managed PostgreSQL database:
- **Vercel Postgres** (Easy)
- **Supabase**
- **Neon**

Update `DATABASE_URL` in your production environment variables.

### Build
Run the production build locally to ensure no errors:
```bash
npm run build
```

### Deployment (Vercel)
1. Push to GitHub/GitLab.
2. Import project to Vercel.
3. Configure Environment Variables.
4. Redeploy.

## Troubleshooting

**"Prisma Client not initialized"**
- Run `npm run prisma:generate`
- Restart the dev server

**"OAuthAccountNotLinked"**
- This happens if you try to sign in with Google using an email that already exists via password signup. NextAuth security defaults prevent automatic linking. Sign in with the original method first.
