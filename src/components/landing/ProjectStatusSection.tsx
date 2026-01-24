"use client";

import { Check, Clock, AlertCircle } from "lucide-react";

const currentFeatures = [
    "File explorer with syntax highlighting",
    "Line-by-line AI explanations",
    "Cross-file symbol resolution (AST-based)",
    "Dependency graph with caching",
    "Semantic code search (initial implementation)",
    "Vector embeddings with Gemini API",
    "Multi-band confidence thresholding"
];

const plannedFeatures = [
    "Multi-repository support",
    "Custom explanation templates",
    "Project-wide search interface",
    "Performance optimizations for large codebases",
    "Additional language parsers (C++, Rust, Go)",
    "Collaborative annotations"
];

export function ProjectStatusSection() {
    return (
        <section className="px-6 py-20 border-t border-border bg-muted/20">
            <div className="max-w-4xl mx-auto">
                {/* Status badge */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    <Clock size={20} className="text-yellow-500" />
                    <span className="text-lg font-semibold">Project Status: In Progress</span>
                </div>

                <div className="grid md:grid-cols-2 gap-8 mb-8">
                    {/* What works now */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold flex items-center gap-2">
                            <Check size={20} className="text-green-500" />
                            What Works Now
                        </h3>
                        <ul className="space-y-2">
                            {currentFeatures.map((feature, index) => (
                                <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <Check size={16} className="text-green-500 shrink-0 mt-0.5" />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* What's planned */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold flex items-center gap-2">
                            <Clock size={20} className="text-blue-500" />
                            What&apos;s Planned
                        </h3>
                        <ul className="space-y-2">
                            {plannedFeatures.map((feature, index) => (
                                <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <Clock size={16} className="text-blue-500 shrink-0 mt-0.5" />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Disclaimer */}
                <div className="p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
                    <div className="flex items-start gap-3">
                        <AlertCircle size={20} className="text-yellow-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="font-medium text-sm">Important Disclaimer</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                All code explanations are AI-generated using Google Gemini and may require verification.
                                This tool is designed for learning and exploration, not for production use without review.
                                The semantic search uses heuristics and confidence scoring - treat results as suggestions, not facts.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
