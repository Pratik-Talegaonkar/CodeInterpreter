import { getServerSession as nextAuthGetServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

// Re-export security utilities
export * from '@/lib/security';

/**
 * Get the current session on the server
 * Wrapper around NextAuth's getServerSession with our auth options
 */
export async function getServerSession() {
    return nextAuthGetServerSession(authOptions);
}

