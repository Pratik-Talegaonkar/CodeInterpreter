import { NextResponse } from 'next/server';
import simpleGit from 'simple-git';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

export async function POST(request: Request) {
    try {
        const { repoUrl } = await request.json();

        if (!repoUrl) {
            return NextResponse.json({ error: 'Repository URL is required' }, { status: 400 });
        }

        // Basic validation of GitHub URL
        if (!repoUrl.includes('github.com')) {
            return NextResponse.json({ error: 'Only GitHub repositories are supported currently' }, { status: 400 });
        }

        // Generate a session ID (or use consistent hash for same repo caching?)
        // Improving caching: Use btoa of repoUrl to reuse same folder for same repo
        // This leverages Vercel's potential warm lambda disk
        // BUT, multiple users might race. 
        // Let's use a hash of the URL.
        const repoHash = Buffer.from(repoUrl).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
        const sessionId = repoHash.substring(0, 12); // Shorten for readability

        // Use OS temp dir (works on Vercel)
        const tmpDir = os.tmpdir();
        const projectPath = path.join(tmpDir, 'code-interpreter', sessionId);

        console.log(`[GitHub] Cloning ${repoUrl} to ${projectPath}`);

        // Check if exists
        try {
            await fs.access(projectPath);
            console.log(`[GitHub] Repo already exists at ${projectPath}, returning cached.`);
            // Optional: git pull? For simplicity, assume immutable for now or fast enough to re-clone if we nuked it.
            // Actually, if it exists, use it.
            return NextResponse.json({
                sessionId,
                projectPath,
                message: 'Repository loaded from cache'
            });
        } catch (e) {
            // Does not exist, proceed to clone
        }

        // Ensure parent dir exists
        await fs.mkdir(path.dirname(projectPath), { recursive: true });

        const git = simpleGit();

        // Clone with depth 1 for speed
        await git.clone(repoUrl, projectPath, ['--depth', '1']);

        return NextResponse.json({
            sessionId,
            projectPath,
            message: 'Repository cloned successfully'
        });

    } catch (error: any) {
        console.error('GitHub Clone error:', error);
        return NextResponse.json({
            error: 'Failed to clone repository: ' + error.message
        }, { status: 500 });
    }
}
