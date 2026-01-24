"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { User, Settings, LogOut, ChevronDown } from "lucide-react";

export function UserDropdown() {
    const { data: session, status } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [isOpen]);

    const handleLogout = async () => {
        await signOut({ callbackUrl: '/' });
    };

    // Get user initials for avatar
    const getUserInitials = () => {
        if (!session?.user?.email) return '?';
        return session.user.email.charAt(0).toUpperCase();
    };

    if (status === 'loading') {
        return (
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
        );
    }

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Avatar button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary transition-colors"
            >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    {session?.user?.image ? (
                        <img
                            src={session.user.image}
                            alt="User avatar"
                            className="w-8 h-8 rounded-full"
                        />
                    ) : (
                        <span className="text-sm font-medium text-primary">
                            {getUserInitials()}
                        </span>
                    )}
                </div>
                <ChevronDown
                    size={16}
                    className={`text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""
                        }`}
                />
            </button>

            {/* Dropdown menu */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-background shadow-lg z-50">
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-border">
                        <p className="text-sm font-medium truncate">
                            {session?.user?.name || 'User'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                            {session?.user?.email || 'No email'}
                        </p>
                    </div>

                    {/* Menu items */}
                    <div className="py-2">
                        <button
                            onClick={() => setIsOpen(false)}
                            disabled
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Settings size={16} />
                            Settings (Coming Soon)
                        </button>

                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                            <LogOut size={16} />
                            Sign Out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
