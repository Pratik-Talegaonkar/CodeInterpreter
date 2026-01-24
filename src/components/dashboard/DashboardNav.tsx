"use client";

import Link from "next/link";
import { UserDropdown } from "./UserDropdown";

export function DashboardNav() {
    return (
        <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-16 items-center px-6">
                {/* Logo/Brand */}
                <div className="flex items-center gap-6">
                    <Link href="/dashboard" className="font-mono font-bold text-lg">
                        CodeInterpreter
                    </Link>

                    {/* Optional: Additional nav items */}
                    <div className="hidden md:flex items-center gap-4 text-sm">
                        <Link
                            href="/app"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Analyzer
                        </Link>
                        <span className="text-muted-foreground/50 cursor-not-allowed opacity-50">
                            Projects
                        </span>
                        <span className="text-muted-foreground/50 cursor-not-allowed opacity-50">
                            Settings
                        </span>
                    </div>
                </div>

                {/* Right side */}
                <div className="ml-auto flex items-center gap-4">
                    <UserDropdown />
                </div>
            </div>
        </nav>
    );
}
