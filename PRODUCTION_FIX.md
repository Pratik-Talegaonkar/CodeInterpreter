# Production Deployment Fix

The deployment failed because the project is configured for **SQLite** (local development), but Vercel requires **PostgreSQL**. The login appearing to "freeze" is actually the server crashing when it tries to write to a database that doesn't exist or isn't writable in the serverless environment.

Follow these steps to fix your Vercel deployment.

## Step 1: Switch to PostgreSQL

1. Open `prisma/schema.prisma`.
2. Change the `provider` line:

```prisma
// BEFORE
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// AFTER
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

## Step 2: Reset Migrations

The existing migrations in `prisma/migrations` are for SQLite and will fail on PostgreSQL.

1. **Delete** the `prisma/migrations` folder entirely.

## Step 3: Configure Vercel

1. Go to your Vercel Project Dashboard.
2. **Storage** → **Create Database** → Select **Vercel Postgres** (or Supabase).
3. Follow the prompts to create the store.
4. Vercel will automatically add `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING` to your environment variables.
5. Go to **Settings** → **Environment Variables**.
6. Ensure `DATABASE_URL` is set to the value of `POSTGRES_PRISMA_URL` (or create it and reference the system variable).
7. Ensure `NEXTAUTH_SECRET` and `NEXTAUTH_URL` are set.
   * `NEXTAUTH_URL`: `https://your-project-name.vercel.app` (The assigned domain).

## Step 4: Deploy and Sync Schema

1. Commit and push your changes (with `provider = "postgresql"` and deleted migrations).
2. Vercel will trigger a new deployment.
3. **IMPORTANT**: Since we deleted migrations, we need to push the schema structure to the new production DB.
   
   If you have the Vercel CLI installed and linked:
   ```bash
   npx prisma db push
   ```
   (This requires the `.env` to point to the production DB).

   **Alternative (Easier):**
   1. Go to Vercel Dashboard → **Settings** → **General**.
   2. Change the **Build Command** to:
      ```bash
      npx prisma generate && npx prisma db push && next build
      ```
   3. Redeploy. 
   *(Note: Using `db push` in build command is fine for initial setup. For long term production, you should revert to `prisma migrate deploy` workflow).*

## Using Local Dev after this?

To use local dev again (with SQLite) after pushing:
1. Revert `provider = "postgresql"` back to `"sqlite"`.
2. Run `npm run dev`.
(Do not commit this reversion if you deploy again).
