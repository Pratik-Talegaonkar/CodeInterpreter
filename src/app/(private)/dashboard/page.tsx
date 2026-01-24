import { DashboardNav } from "@/components/dashboard/DashboardNav";
import Link from "next/link";
import { FolderOpen, ArrowRight } from "lucide-react";

export default function DashboardPage() {
    return (
        <div className="min-h-screen bg-background">
            <DashboardNav />

            <main className="container mx-auto px-6 py-16">
                <div className="max-w-2xl mx-auto text-center space-y-8">
                    {/* Icon */}
                    <div className="inline-flex p-6 rounded-full bg-primary/10">
                        <FolderOpen size={48} className="text-primary" />
                    </div>

                    {/* Heading */}
                    <div className="space-y-3">
                        <h1 className="text-3xl font-bold">Welcome to CodeInterpreter</h1>
                        <p className="text-muted-foreground">
                            Access the code analysis tool to explore project folders and generate AI-powered explanations.
                        </p>
                    </div>

                    {/* CTA */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Link
                            href="/app"
                            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors group"
                        >
                            Open Code Analyzer
                            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>

                    {/* Info boxes */}
                    <div className="grid md:grid-cols-2 gap-4 pt-8">
                        <div className="p-6 rounded-lg border border-border bg-card text-left">
                            <h3 className="font-semibold mb-2">Current Features</h3>
                            <ul className="text-sm text-muted-foreground space-y-1">
                                <li>• File explorer with syntax highlighting</li>
                                <li>• AI-powered line explanations</li>
                                <li>• Cross-file symbol resolution</li>
                                <li>• Semantic code search</li>
                            </ul>
                        </div>

                        <div className="p-6 rounded-lg border border-border bg-card text-left">
                            <h3 className="font-semibold mb-2">Planned Features</h3>
                            <ul className="text-sm text-muted-foreground space-y-1">
                                <li>• Project upload interface</li>
                                <li>• Project history</li>
                                <li>• Custom settings</li>
                                <li>• Usage analytics</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
