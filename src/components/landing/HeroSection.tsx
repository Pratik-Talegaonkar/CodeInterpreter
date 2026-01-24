"use client";

import Link from "next/link";
import { Github, ArrowRight } from "lucide-react";

export function HeroSection() {
    return (
        <section className="min-h-[80vh] flex flex-col items-center justify-center px-6 py-20">
            <div className="max-w-4xl mx-auto text-center space-y-8">
                {/* Product Name */}
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
                    <span className="font-mono">CodeInterpreter</span>
                </h1>

                {/* Tagline - honest, technical */}
                <p className="text-xl md:text-2xl text-muted-foreground font-medium">
                    AI-assisted code comprehension for real-world codebases
                </p>

                {/* Supporting paragraph - transparent about status */}
                <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                    Analyze entire project folders, get file-wise explanations, and understand cross-file dependencies.
                    Uses AST parsing and semantic search to provide context-aware code explanations.
                    <span className="block mt-2 text-sm opacity-75">Work in progress.</span>
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                    <Link
                        href="/app"
                        className="group inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                    >
                        Start Analysis
                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </Link>

                    <a
                        href="https://github.com/Pratik-Talegaonkar/CodeInterpreter"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 border border-border px-6 py-3 rounded-lg font-medium hover:bg-secondary transition-colors"
                    >
                        <Github size={18} />
                        View on GitHub
                    </a>
                </div>
            </div>
        </section>
    );
}
