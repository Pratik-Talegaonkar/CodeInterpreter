import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Types for our file system
export type FileNode = {
    id: string;
    name: string;
    type: "file" | "folder";
    children?: FileNode[];
    language?: string;
    path: string; // Absolute path for backend, masked ID for frontend
};

const IGNORED_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build', '.vscode', '.idea']);
const IGNORED_FILES = new Set(['.DS_Store', 'Thumbs.db']);

async function getDirectoryStructure(dirPath: string): Promise<FileNode[]> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const nodes: FileNode[] = [];

    for (const entry of entries) {
        if (IGNORED_DIRS.has(entry.name) || IGNORED_FILES.has(entry.name) || entry.name.startsWith('.')) {
            continue;
        }

        const fullPath = path.join(dirPath, entry.name);
        // Use a simplified ID strategy for now - in production, might want base64 of path
        const id = Buffer.from(fullPath).toString('base64');

        if (entry.isDirectory()) {
            // Recursion happens here
            // Note: For very large repos, we might want to lazy load (not recurse immediately)
            // But for "Simple", let's load one level deep and assume lazy loading client side or manageable size.
            // Actually, for a robust explorer, returning the whole tree can be heavy.
            // Let's implement lazy loading: Only return structure for THIS directory.

            nodes.push({
                id,
                name: entry.name,
                type: "folder",
                path: fullPath,
                children: [] // Client will fetch children when opening
            });
        } else {
            nodes.push({
                id,
                name: entry.name,
                type: "file",
                path: fullPath,
                language: getLanguage(entry.name)
            });
        }
    }

    // Sort: Folders first, then files, both alphabetical
    return nodes.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === "folder" ? -1 : 1;
    });
}

function getLanguage(filename: string): string {
    const ext = path.extname(filename).toLowerCase().slice(1);
    const map: Record<string, string> = {
        ts: 'typescript', tsx: 'typescript',
        js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
        py: 'python',
        java: 'java',
        c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp',
        css: 'css', scss: 'scss',
        html: 'html',
        json: 'json',
        md: 'markdown',
        go: 'go',
        rs: 'rust',
        rb: 'ruby',
        php: 'php'
    };
    return map[ext] || 'plaintext';
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { path: requestedPath } = body;

        if (!requestedPath) {
            return NextResponse.json({ error: 'Path is required' }, { status: 400 });
        }

        // Security check: ensure path exists and is a directory
        try {
            const stats = await fs.stat(requestedPath);
            if (!stats.isDirectory()) {
                return NextResponse.json({ error: 'Path is not a directory' }, { status: 400 });
            }
        } catch (e) {
            return NextResponse.json({ error: 'Directory not found' }, { status: 404 });
        }

        const files = await getDirectoryStructure(requestedPath);
        return NextResponse.json({ files });

    } catch (error) {
        console.error('File scan error:', error);
        return NextResponse.json({ error: 'Failed to scan files' }, { status: 500 });
    }
}
