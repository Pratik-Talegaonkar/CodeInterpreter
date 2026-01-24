"use client";

import { ExternalLink } from "lucide-react";

const techStack = [
    {
        category: "Frontend",
        items: [
            { name: "Next.js 14", detail: "App Router with server/client components" },
            { name: "React", detail: "UI library" },
            { name: "TailwindCSS", detail: "Styling" }
        ]
    },
    {
        category: "Authentication",
        items: [
            { name: "NextAuth.js", detail: "Session management" },
            { name: "Prisma", detail: "Database ORM" },
            { name: "SQLite/PostgreSQL", detail: "User storage" }
        ]
    },
    {
        category: "AI & Embeddings",
        items: [
            { name: "Google Gemini", detail: "gemini-flash for explanations" },
            { name: "text-embedding-004", detail: "Code embeddings" },
            { name: "Cosine similarity", detail: "Vector search" }
        ]
    },
    {
        category: "Code Analysis",
        items: [
            { name: "@typescript-eslint", detail: "TypeScript/JavaScript AST parsing" },
            { name: "Python regex", detail: "Python code extraction (simplified)" },
            { name: "java-parser", detail: "Java code analysis" }
        ]
    },
    {
        category: "Storage & Caching",
        items: [
            { name: "File-based cache", detail: "Dependency graphs (MD5 hashing)" },
            { name: "In-memory vector store", detail: "Semantic search index" }
        ]
    }
];

export function TechStackSection() {
    return (
        <section className="px-6 py-20 border-t border-border">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">Tech Stack</h2>
                    <p className="text-muted-foreground">
                        The actual technologies used, not buzzwords
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {techStack.map((stack, index) => (
                        <div key={index} className="space-y-4">
                            <h3 className="text-lg font-semibold text-primary">{stack.category}</h3>
                            <div className="space-y-3">
                                {stack.items.map((item, idx) => (
                                    <div key={idx} className="flex items-start gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="font-mono text-sm font-medium">{item.name}</div>
                                            <div className="text-sm text-muted-foreground">{item.detail}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-12 p-6 rounded-lg bg-muted/30 border border-border">
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        Why These Choices?
                    </h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>• <strong>Gemini over OpenAI:</strong> Free tier for embeddings, good code understanding</li>
                        <li>• <strong>In-memory vector store:</strong> Zero dependencies, fast for small-medium projects</li>
                        <li>• <strong>File-based caching:</strong> Simple, no external database required</li>
                        <li>• <strong>AST parsing:</strong> Deterministic symbol resolution, not regex guessing</li>
                    </ul>
                </div>
            </div>
        </section>
    );
}
