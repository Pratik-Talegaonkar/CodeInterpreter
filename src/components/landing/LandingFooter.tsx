"use client";

import Link from "next/link";
import { Github, FileText } from "lucide-react";

export function LandingFooter() {
    return (
        <footer className="border-t border-border px-6 py-12 bg-muted/10">
            <div className="max-w-6xl mx-auto">
                <div className="grid md:grid-cols-3 gap-8 mb-8">
                    {/* Project info */}
                    <div className="space-y-3">
                        <div className="font-mono font-bold text-lg">CodeInterpreter</div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Built by Pratik Talegaonkar as a learning-focused engineering project.
                            Open source and transparent about capabilities.
                        </p>
                    </div>

                    {/* Links */}
                    <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Resources</h4>
                        <div className="flex flex-col gap-2">
                            <a
                                href="https://github.com/Pratik-Talegaonkar/CodeInterpreter"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2"
                            >
                                <Github size={16} />
                                GitHub Repository
                            </a>
                            <Link
                                href="/docs"
                                className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2 opacity-50 cursor-not-allowed"
                                onClick={(e) => e.preventDefault()}
                            >
                                <FileText size={16} />
                                Documentation (Coming Soon)
                            </Link>
                        </div>
                    </div>

                    {/* Legal/Status */}
                    <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Status</h4>
                        <div className="text-sm text-muted-foreground space-y-1">
                            <p>Active Development</p>
                            <p>Not Production-Ready</p>
                            <p>AI Outputs Require Verification</p>
                        </div>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
                    <p>© 2026 Pratik Talegaonkar. Learning project, not a commercial service.</p>
                    <div className="flex gap-6">
                        <a
                            href="https://github.com/Pratik-Talegaonkar/CodeInterpreter"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-foreground transition-colors"
                        >
                            GitHub
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
