"use client";

import { Info, AlertTriangle, Lightbulb, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface Explanation {
    line_number: number;
    explanation: string;
}

interface FileContext {
    summary: string;
    key_features?: string[];
    complexity?: string;
    notes?: string[];
    meta?: {
        tokens: number;
        cost: number;
    };
    isCached?: boolean;
}

interface ExplanationPanelProps {
    selectedLine?: number | null;
    fileContent?: string;
    fileLanguage?: string;
    filePath?: string;
    projectRoot?: string;
}

export function ExplanationPanel({ selectedLine, fileContent, fileLanguage, filePath, projectRoot }: ExplanationPanelProps) {
    const [context, setContext] = useState<FileContext | null>(null);
    const [lineExplanation, setLineExplanation] = useState<string | null>(null);
    const [loadingContext, setLoadingContext] = useState(false);
    const [loadingLine, setLoadingLine] = useState(false);

    // Fetch File Summary when content changes
    useEffect(() => {
        if (!fileContent || fileContent.startsWith("//")) return;

        const fetchSummary = async () => {
            setLoadingContext(true);
            try {
                const res = await fetch('/api/explain', {
                    method: 'POST',
                    body: JSON.stringify({
                        code: fileContent,
                        language: fileLanguage,
                        file_path: filePath,
                        project_root: projectRoot
                    })
                });
                const data = await res.json();
                setContext(data);
            } catch (e: any) {
                console.error("Summary Fetch Error:", e);
                setContext({
                    summary: "Failed to load summary. " + (e.message || ""),
                    notes: ["Check server console for details."]
                });
            } finally {
                setLoadingContext(false);
            }
        };

        fetchSummary();
    }, [fileContent, fileLanguage]);


    // Fetch Line Explanation when selection changes
    useEffect(() => {
        if (!selectedLine || !fileContent) {
            setLineExplanation(null);
            return;
        }

        const fetchLineExplanation = async () => {
            setLoadingLine(true);
            try {
                const lines = fileContent.split('\n');
                const targetLine = lines[selectedLine - 1];
                const before = lines.slice(Math.max(0, selectedLine - 3), selectedLine - 1).join('\n');
                const after = lines.slice(selectedLine, Math.min(lines.length, selectedLine + 2)).join('\n');

                const res = await fetch('/api/explain', {
                    method: 'POST',
                    body: JSON.stringify({
                        code: fileContent,
                        language: fileLanguage,
                        line_number: selectedLine,
                        context_lines: { target: targetLine, before, after },
                        file_path: filePath,
                        project_root: projectRoot
                    })
                });
                const data = await res.json();

                if (data.error) {
                    setLineExplanation("Error: " + data.error);
                } else if (data.explanation) {
                    setLineExplanation(data.explanation);
                } else {
                    setLineExplanation("No explanation returned from server.");
                }

                // Update context meta if returned in line explanation (unified response)
                if (data.meta) {
                    setContext(prev => ({ ...prev, meta: data.meta, isCached: data.isCached } as any));
                }
            } catch (e: any) {
                setLineExplanation("Failed to get explanation: " + e.message);
            } finally {
                setLoadingLine(false);
            }
        };

        fetchLineExplanation();
    }, [selectedLine, fileContent, fileLanguage]);


    const [activeTab, setActiveTab] = useState<'line' | 'file'>('file');

    // Switch to line tab when a line is selected
    useEffect(() => {
        if (selectedLine) setActiveTab('line');
    }, [selectedLine]);

    return (
        <div className="h-full bg-secondary/30 border-l border-border flex flex-col">
            <div className="border-b border-border bg-secondary/10">
                <div className="flex">
                    <button
                        onClick={() => setActiveTab('line')}
                        className={cn(
                            "flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2",
                            activeTab === 'line'
                                ? "border-primary text-primary bg-background/50"
                                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-background/30"
                        )}
                    >
                        Line Detail
                    </button>
                    <button
                        onClick={() => setActiveTab('file')}
                        className={cn(
                            "flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2",
                            activeTab === 'file'
                                ? "border-primary text-primary bg-background/50"
                                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-background/30"
                        )}
                    >
                        File Overview
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4">

                {/* Line Tab content */}
                <div className={cn("space-y-4", activeTab === 'line' ? "block" : "hidden")}>
                    <div className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                        <Sparkles size={16} className="text-purple-500" />
                        AI Line Analysis
                    </div>

                    {selectedLine ? (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="text-xs text-muted-foreground mb-2 font-mono uppercase tracking-wider flex justify-between">
                                <span>Line {selectedLine}</span>
                                {loadingLine && <Loader2 size={12} className="animate-spin" />}
                            </div>

                            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-foreground/90 leading-relaxed shadow-sm relative overflow-hidden text-sm">
                                {loadingLine ? (
                                    <div className="flex flex-col gap-2">
                                        <div className="h-4 bg-primary/20 rounded w-3/4 animate-pulse"></div>
                                        <div className="h-4 bg-primary/20 rounded w-1/2 animate-pulse"></div>
                                        <div className="h-4 bg-primary/20 rounded w-5/6 animate-pulse"></div>
                                    </div>
                                ) : (
                                    lineExplanation
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 rounded-lg border border-dashed border-border flex flex-col items-center justify-center text-center gap-2 text-muted-foreground">
                            <Sparkles size={24} className="opacity-20" />
                            <p className="text-sm">Select a line of code to see a specific explanation.</p>
                            <button
                                onClick={() => setActiveTab('file')}
                                className="text-xs text-primary hover:underline mt-2"
                            >
                                View File Summary
                            </button>
                        </div>
                    )}
                </div>

                {/* File Tab content */}
                <div className={cn("space-y-6", activeTab === 'file' ? "block" : "hidden")}>
                    <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Info size={16} className="text-blue-500" />
                        Project Context & Summary
                    </div>

                    {loadingContext ? (
                        <div className="space-y-4 p-4 rounded-lg border border-border/50 bg-background/50">
                            <div className="h-4 bg-secondary rounded w-1/3 animate-pulse"></div>
                            <div className="space-y-2">
                                <div className="h-3 bg-secondary rounded w-full animate-pulse"></div>
                                <div className="h-3 bg-secondary rounded w-full animate-pulse"></div>
                                <div className="h-3 bg-secondary rounded w-5/6 animate-pulse"></div>
                            </div>
                        </div>
                    ) : context ? (
                        <div className="animate-in fade-in duration-500 space-y-6">

                            {/* Summary Card */}
                            <div className="p-4 rounded-lg bg-secondary/20 border border-border">
                                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2 opacity-70">Analysis</h4>
                                <div className="text-sm text-foreground/90 leading-relaxed">
                                    {context.summary}
                                </div>
                            </div>

                            {/* Key Features */}
                            {context.key_features && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider opacity-70 flex items-center gap-2">
                                        <Lightbulb size={12} /> Key Features
                                    </h4>
                                    <div className="rounded-lg border border-border/50 overflow-hidden">
                                        {context.key_features.map((f, i) => (
                                            <div key={i} className="px-3 py-2 text-xs border-b border-border/50 last:border-0 bg-background/50 flex gap-2">
                                                <span className="text-primary">•</span> {f}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Complexity & Notes */}
                            <div className="grid grid-cols-1 gap-2">
                                {context.complexity && (
                                    <div className="flex gap-2 text-xs text-muted-foreground bg-amber-500/10 p-3 rounded border border-amber-500/20 items-center">
                                        <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                                        <span className="font-medium text-amber-600 dark:text-amber-400">Complexity: {context.complexity}</span>
                                    </div>
                                )}

                                {context.notes && context.notes.map((note, idx) => (
                                    <div key={idx} className="text-xs text-muted-foreground bg-blue-500/10 p-3 rounded border border-blue-500/20">
                                        {note}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 text-center text-xs text-muted-foreground bg-secondary/10 rounded-lg border border-dashed border-border">
                            No file loaded. Select a file to view its summary.
                        </div>
                    )}
                </div>
            </div>

            {/* Meta / Usage Status */}
            {context?.meta && (
                <div className="p-2 border-t border-border bg-secondary/10 text-[10px] text-muted-foreground flex justify-between items-center bg-card/50 backdrop-blur-sm">
                    <span title="Estimated AI Cost">
                        Est. Cost: ${Number(context.meta.cost).toFixed(6)}
                    </span>
                    <div className="flex gap-2">
                        <span>{context.meta.tokens} tokens</span>
                        {context.isCached && (
                            <span className="bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold text-[9px] border border-green-500/20">
                                Cached
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
