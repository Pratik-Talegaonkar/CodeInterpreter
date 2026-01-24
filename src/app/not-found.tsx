import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background">
            <div className="p-4 rounded-full bg-muted text-muted-foreground mb-6">
                <FileQuestion size={48} />
            </div>
            <h2 className="text-2xl font-bold mb-4">Page Not Found</h2>
            <p className="text-muted-foreground max-w-md mb-8">
                The page you are looking for does not exist or has been moved.
            </p>
            <Link
                href="/"
                className="px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
                Return Home
            </Link>
        </div>
    );
}
