import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs'; // isomorphic-git needs fs, not fs/promises usually for its fs plugin, but let's check docs
import fsp from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';

export async function POST(request: Request) {
    try {
        const { repoUrl } = await request.json();

        if (!repoUrl) {
            return NextResponse.json({ error: 'Repository URL is required' }, { status: 400 });
        }

        if (!repoUrl.includes('github.com')) {
            return NextResponse.json({ error: 'Only GitHub repositories are supported currently' }, { status: 400 });
        }

        // Generate session ID
        const repoHash = Buffer.from(repoUrl).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
        const sessionId = repoHash.substring(0, 12);

        const tmpDir = os.tmpdir();
        const projectPath = path.join(tmpDir, 'code-interpreter', sessionId);

        console.log(`[GitHub] Cloning ${repoUrl} to ${projectPath}`);

        // Check availability
        try {
            await fsp.access(projectPath);
            console.log(`[GitHub] Repo already exists at ${projectPath}, returning cached.`);
            return NextResponse.json({
                sessionId,
                projectPath,
                message: 'Repository loaded from cache'
            });
        } catch (e) {
            // Clone needed
        }

        await fsp.mkdir(projectPath, { recursive: true });

        // Clone using isomorphic-git
        await git.clone({
            fs,
            http,
            dir: projectPath,
            url: repoUrl,
            depth: 1,
            singleBranch: true,
            // onProgress: (event) => console.log(event.phase)
        });

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
