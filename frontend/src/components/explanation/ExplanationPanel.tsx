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
}

export function ExplanationPanel({ selectedLine, fileContent, fileLanguage }: ExplanationPanelProps) {
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
                        language: fileLanguage
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
                        context_lines: { target: targetLine, before, after }
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


    return (
        <div className="h-full bg-secondary/30 border-l border-border flex flex-col">
            <div className="p-4 border-b border-border bg-secondary/10">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Sparkles size={16} className="text-purple-500" />
                    AI Insights
                </h2>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-6">

                {/* Selected Line Section */}
                <div className="space-y-4">
                    {selectedLine ? (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="text-xs text-muted-foreground mb-2 font-mono uppercase tracking-wider flex justify-between">
                                <span>Line {selectedLine}</span>
                                {loadingLine && <Loader2 size={12} className="animate-spin" />}
                            </div>

                            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-foreground/90 leading-relaxed shadow-sm relative overflow-hidden">
                                {loadingLine ? (
                                    <div className="flex flex-col gap-2">
                                        <div className="h-4 bg-primary/20 rounded w-3/4 animate-pulse"></div>
                                        <div className="h-4 bg-primary/20 rounded w-1/2 animate-pulse"></div>
                                    </div>
                                ) : (
                                    lineExplanation
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 rounded-lg bg-secondary/40 border border-border/50 text-muted-foreground text-sm text-center italic">
                            Select a line of code to see a specific explanation.
                        </div>
                    )}
                </div>

                {/* File Context / Summary Section */}
                <div className="pt-6 border-t border-border">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3 flex items-center gap-2">
                        <Info size={14} /> File Summary
                    </h3>

                    {loadingContext ? (
                        <div className="space-y-2">
                            <div className="h-3 bg-secondary rounded w-full animate-pulse"></div>
                            <div className="h-3 bg-secondary rounded w-5/6 animate-pulse"></div>
                            <div className="h-3 bg-secondary rounded w-4/6 animate-pulse"></div>
                        </div>
                    ) : context ? (
                        <div className="animate-in fade-in duration-500">
                            <div className="text-sm text-foreground/80 leading-relaxed mb-4">
                                {context.summary}
                            </div>

                            {context.key_features && (
                                <div className="space-y-2 mb-4">
                                    <span className="text-xs font-bold text-muted-foreground">Key Features:</span>
                                    <ul className="list-disc list-inside text-xs text-muted-foreground ml-1">
                                        {context.key_features.map((f, i) => <li key={i}>{f}</li>)}
                                    </ul>
                                </div>
                            )}

                            {context.complexity && (
                                <div className="flex gap-2 text-xs text-muted-foreground bg-secondary/20 p-2 rounded border border-border/50">
                                    <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                    <span>Complexity: {context.complexity}</span>
                                </div>
                            )}

                            {context.notes && context.notes.map((note, idx) => (
                                <div key={idx} className="mt-2 text-xs text-muted-foreground bg-secondary/20 p-2 rounded">
                                    <span>{note}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-xs text-muted-foreground">No context available.</div>
                    )}
                </div>
            </div>

            {/* Meta / Usage Status */}
            {context?.meta && (
                <div className="p-2 border-t border-border bg-secondary/10 text-[10px] text-muted-foreground flex justify-between items-center bg-card/50 backdrop-blur-sm">
                    <span>
                        Est. Cost: ${Number(context.meta.cost).toFixed(6)}
                    </span>
                    {context.isCached && (
                        <span className="bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold text-[9px] border border-green-500/20">
                            Cached
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
