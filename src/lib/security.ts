import { hash, compare } from 'bcryptjs';

/**
 * Hash a password using bcrypt
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
    return hash(password, 12);
}

/**
 * Verify a password against a hash
 * @param password - Plain text password to verify
 * @param hashedPassword - Hashed password to compare against
 * @returns True if password matches, false otherwise
 */
export async function verifyPassword(
    password: string,
    hashedPassword: string
): Promise<boolean> {
    return compare(password, hashedPassword);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate password strength
 * Minimum 8 characters - keep it simple
 */
export function isValidPassword(password: string): boolean {
    return password.length >= 8;
}
