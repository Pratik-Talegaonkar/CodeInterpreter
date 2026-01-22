# Setup Guide for Code Explainer AI

It looks like **Node.js** is missing or not configured in your system path, which is preventing dependencies from being installed. This is causing the "Cannot find module" and type errors you see.

## 1. Install Node.js
1. Download the **LTS version** of Node.js from [nodejs.org](https://nodejs.org/).
2. Install it and ensure you check the box to **"Add to PATH"**.
3. Restart your terminal/VS Code to pick up the changes.

## 2. Install Dependencies
Once Node.js is ready, run this command in the `frontend` folder:

```bash
npm install
```

This will fix:
- `Cannot find module 'react'`
- `JSX element implicitly has type 'any'`
- `Unknown at rule @tailwind` (mostly)

## 3. Run the App
```bash
npm run dev
```

The application will be available at `http://localhost:3000`.
