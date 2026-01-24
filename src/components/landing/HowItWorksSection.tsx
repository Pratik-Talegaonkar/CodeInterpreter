"use client";

import { FileSearch, GitBranch, Network, Search, Sparkles } from "lucide-react";

const features = [
    {
        icon: FileSearch,
        title: "Folder-Level Analysis",
        description: "Scans entire project directories recursively. Builds dependency graphs using AST parsing to map imports, exports, and symbol definitions across files."
    },
    {
        icon: GitBranch,
        title: "Cross-File Symbol Resolution",
        description: "Resolves function and class references across files. Tracks import statements and extracts definitions from dependent modules to provide accurate context."
    },
    {
        icon: Network,
        title: "Semantic Code Search",
        description: "Uses vector embeddings (Gemini text-embedding-004) to find semantically similar code. Performs cosine similarity search with multi-band confidence thresholding."
    },
    {
        icon: Sparkles,
        title: "Context-Aware Explanations",
        description: "Generates line-level explanations using Google Gemini with cross-file context injection. Combines AST-based symbol resolution with semantic search fallbacks."
    }
];

export function HowItWorksSection() {
    return (
        <section className="px-6 py-20 border-t border-border">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        Technical overview of the code analysis pipeline
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="p-6 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors"
                        >
                            <div className="flex items-start gap-4">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                                    <feature.icon size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {feature.description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Additional technical details */}
                <div className="mt-12 p-6 rounded-lg bg-muted/30 border border-border">
                    <h4 className="text-sm font-mono font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                        Implementation Details
                    </h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>• Supports JavaScript/TypeScript, Python, and Java parsing</li>
                        <li>• Dependency graphs cached with incremental updates (MD5 hashing)</li>
                        <li>• In-memory vector store with cosine similarity search</li>
                        <li>• Rate-limited batch embedding generation (10-20 units per batch)</li>
                        <li>•  Max 3-5 semantic results per query with confidence filtering</li>
                    </ul>
                </div>
            </div>
        </section>
    );
}
