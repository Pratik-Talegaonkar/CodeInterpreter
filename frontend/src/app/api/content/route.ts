import { NextResponse } from 'next/server';
import fs from 'fs/promises';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { path: filePath } = body;

        if (!filePath) {
            return NextResponse.json({ error: 'File path is required' }, { status: 400 });
        }

        // Security: In a real app, validate this path is within allowed directories
        // For this local tool, we assume the user has access to their own file system.

        try {
            const content = await fs.readFile(filePath, 'utf-8');
            // Simple heuristic to check if binary (contains null bytes)
            if (content.includes('\0')) {
                return NextResponse.json({ error: 'Binary file detected' }, { status: 400 });
            }
            return NextResponse.json({ content });
        } catch (e) {
            return NextResponse.json({ error: 'File not found or unreadable' }, { status: 404 });
        }

    } catch (error) {
        console.error('File read error:', error);
        return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
    }
}
