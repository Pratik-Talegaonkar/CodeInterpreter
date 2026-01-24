"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background">
            <div className="p-4 rounded-full bg-destructive/10 text-destructive mb-6">
                <AlertTriangle size={48} />
            </div>
            <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
            <p className="text-muted-foreground max-w-md mb-8">
                We apologize for the inconvenience. An unexpected error occurred while processing your request.
            </p>
            <div className="flex gap-4">
                <button
                    onClick={() => reset()}
                    className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                    Try again
                </button>
                <button
                    onClick={() => window.location.href = "/"}
                    className="px-6 py-2 rounded-lg border border-border hover:bg-secondary transition-colors"
                >
                    Go Home
                </button>
            </div>
        </div>
    );
}
