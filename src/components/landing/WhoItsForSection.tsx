"use client";

import { GraduationCap, Code2, FileCode, Lightbulb } from "lucide-react";

const audiences = [
    {
        icon: GraduationCap,
        title: "CS Students",
        description: "Reading large open-source repositories for coursework or self-study"
    },
    {
        icon: Code2,
        title: "Developers",
        description: "Onboarding to unfamiliar codebases or reviewing inherited projects"
    },
    {
        icon: FileCode,
        title: "Engineers",
        description: "Exploring legacy code, understanding architectural decisions, or conducting code reviews"
    },
    {
        icon: Lightbulb,
        title: "AI Engineering Learners",
        description: "Studying how LLMs can assist with code comprehension and semantic analysis"
    }
];

export function WhoItsForSection() {
    return (
        <section className="px-6 py-20 border-t border-border">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">Who It&apos;s For</h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        Built for specific use cases, not &quot;everyone&quot;
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {audiences.map((audience, index) => (
                        <div
                            key={index}
                            className="p-6 rounded-lg border border-border bg-card text-center hover:border-primary/50 transition-colors"
                        >
                            <div className="inline-flex p-3 rounded-lg bg-primary/10 text-primary mb-4">
                                <audience.icon size={24} />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">{audience.title}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {audience.description}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="mt-12 text-center">
                    <p className="text-sm text-muted-foreground italic">
                        This is not a general-purpose tool for &quot;understanding any codebase perfectly.&quot;
                        It&apos;s a focused learning and exploration aid.
                    </p>
                </div>
            </div>
        </section>
    );
}
