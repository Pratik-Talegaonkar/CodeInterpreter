// Utility functions for the test project

export function formatDate(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    return date.toLocaleDateString('en-US', options);
}

export function parseUser(userData: any): { id: number; name: string; createdAt: Date } {
    return {
        id: userData.id || 0,
        name: userData.name || 'Unknown',
        createdAt: new Date(userData.createdAt || Date.now())
    };
}

export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
