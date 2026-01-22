import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), '.cache', 'explanations');

// Ensure cache directory exists
async function initCache() {
    try {
        await fs.mkdir(CACHE_DIR, { recursive: true });
    } catch (e) {
        // Ignore error if exists
    }
}

export async function getCachedExplanation(key: string) {
    await initCache();
    const hash = crypto.createHash('md5').update(key).digest('hex');
    const filePath = path.join(CACHE_DIR, `${hash}.json`);

    try {
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        return null;
    }
}

export async function setCachedExplanation(key: string, data: any) {
    await initCache();
    const hash = crypto.createHash('md5').update(key).digest('hex');
    const filePath = path.join(CACHE_DIR, `${hash}.json`);

    try {
        await fs.writeFile(filePath, JSON.stringify(data), 'utf-8');
    } catch (e) {
        console.error('Failed to write cache', e);
    }
}
