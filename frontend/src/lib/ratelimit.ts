type RateLimitStore = Map<string, number[]>;

const store: RateLimitStore = new Map();

// Configuration
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 20; // 20 requests per minute

export function checkRateLimit(identifier: string): { success: boolean; remaining: number } {
    const now = Date.now();
    const timestamps = store.get(identifier) || [];

    // Filter out atomic timestamps older than the window
    const validTimestamps = timestamps.filter(ts => now - ts < WINDOW_MS);

    if (validTimestamps.length >= MAX_REQUESTS) {
        return {
            success: false,
            remaining: 0
        };
    }

    // Add new timestamp
    validTimestamps.push(now);
    store.set(identifier, validTimestamps);

    return {
        success: true,
        remaining: MAX_REQUESTS - validTimestamps.length
    };
}
