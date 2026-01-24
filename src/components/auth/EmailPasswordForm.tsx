"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { AlertCircle, Loader2 } from "lucide-react";

interface EmailPasswordFormProps {
    mode: "login" | "signup";
}

export function EmailPasswordForm({ mode }: EmailPasswordFormProps) {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const validateEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const validatePassword = (password: string) => {
        return password.length >= 8;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        // Validation
        if (!validateEmail(email)) {
            setError("Please enter a valid email address");
            return;
        }

        if (!validatePassword(password)) {
            setError("Password must be at least 8 characters");
            return;
        }

        if (mode === "signup" && password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);

        try {
            if (mode === "signup") {
                // Create new user
                const response = await fetch('/api/auth/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });

                const data = await response.json();

                if (!response.ok) {
                    setError(data.error || "Signup failed");
                    setLoading(false);
                    return;
                }

                // Auto-login after signup
                const result = await signIn('credentials', {
                    email,
                    password,
                    redirect: false,
                });

                if (result?.error) {
                    setError("Account created but login failed. Please try logging in.");
                    setLoading(false);
                    return;
                }

                if (result?.ok) {
                    router.push('/dashboard');
                }
            } else {
                // Login existing user
                const result = await signIn('credentials', {
                    email,
                    password,
                    redirect: false,
                });

                if (result?.error) {
                    setError("Invalid email or password");
                    setLoading(false);
                    return;
                }

                if (result?.ok) {
                    router.push('/dashboard');
                }
            }
        } catch (error) {
            setError("An error occurred. Please try again.");
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                    Email address
                </label>
                <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    required
                />
            </div>

            {/* Password */}
            <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                    Password
                </label>
                <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    required
                />
                {password && !validatePassword(password) && (
                    <p className="text-xs text-muted-foreground">
                        Password must be at least 8 characters
                    </p>
                )}
            </div>

            {/* Confirm Password (signup only) */}
            {mode === "signup" && (
                <div className="space-y-2">
                    <label htmlFor="confirmPassword" className="text-sm font-medium">
                        Confirm password
                    </label>
                    <input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        required
                    />
                </div>
            )}

            {/* Error message */}
            {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Submit */}
            <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {loading ? (
                    <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>{mode === "login" ? "Signing in..." : "Creating account..."}</span>
                    </>
                ) : (
                    <span>{mode === "login" ? "Sign in" : "Create account"}</span>
                )}
            </button>

            {/* Note */}
            <p className="text-xs text-center text-muted-foreground">
                {mode === "signup" && (
                    <>By creating an account, you agree that AI outputs require verification.</>
                )}
                {mode === "login" && (
                    <>Placeholder authentication - redirects to dashboard for demo purposes.</>
                )}
            </p>
        </form>
    );
}
