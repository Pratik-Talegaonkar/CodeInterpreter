"use client";

import { useState } from "react";
import { GoogleAuthButton } from "./GoogleAuthButton";
import { EmailPasswordForm } from "./EmailPasswordForm";

export function AuthForm() {
    const [mode, setMode] = useState<"login" | "signup">("login");

    return (
        <div className="w-full max-w-md mx-auto space-y-6">
            {/* Mode toggle */}
            <div className="flex gap-0 p-1 bg-muted rounded-lg">
                <button
                    onClick={() => setMode("login")}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${mode === "login"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    Sign In
                </button>
                <button
                    onClick={() => setMode("signup")}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${mode === "signup"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    Sign Up
                </button>
            </div>

            {/* Header */}
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">
                    {mode === "login" ? "Sign in to your account" : "Create an account"}
                </h2>
                <p className="text-sm text-muted-foreground">
                    {mode === "login"
                        ? "Access your projects and continue analyzing code"
                        : "Start analyzing codebases and exploring AI-powered explanations"}
                </p>
            </div>

            {/* Google OAuth */}
            <GoogleAuthButton mode={mode} />

            {/* Divider */}
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-background text-muted-foreground">Or continue with email</span>
                </div>
            </div>

            {/* Email/Password Form */}
            <EmailPasswordForm mode={mode} />
        </div>
    );
}