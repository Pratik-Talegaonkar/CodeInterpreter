import { AuthForm } from "@/components/auth/AuthForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AuthPage() {
    return (
        <main className="min-h-screen bg-background flex flex-col">
            {/* Back to home link */}
            <div className="p-6">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft size={16} />
                    Back to home
                </Link>
            </div>

            {/* Auth form centered */}
            <div className="flex-1 flex items-center justify-center px-6 py-12">
                <AuthForm />
            </div>

            {/* Footer note */}
            <div className="p-6 text-center">
                <p className="text-xs text-muted-foreground">
                    CodeInterpreter is in active development. Authentication backend coming soon.
                </p>
            </div>
        </main>
    );
}
