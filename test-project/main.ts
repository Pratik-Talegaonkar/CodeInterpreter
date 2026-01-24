// Test project for cross-file context awareness
// This demonstrates imports and cross-file function calls

import { formatDate, parseUser } from './utils';

export interface User {
    id: number;
    name: string;
    createdAt: Date;
}

export function displayUser(userData: any): string {
    const user = parseUser(userData);
    const formattedDate = formatDate(user.createdAt);

    return `User: ${user.name} (joined ${formattedDate})`;
}

export function getUserById(id: number): User | null {
    // Simulated database lookup
    const users = [
        { id: 1, name: 'Alice', createdAt: new Date('2024-01-15') },
        { id: 2, name: 'Bob', createdAt: new Date('2024-02-20') }
    ];

    return users.find(u => u.id === id) || null;
}
