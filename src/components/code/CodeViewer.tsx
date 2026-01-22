"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// Mock code for display
const MOCK_CODE = `import React from 'react';
import { Button } from './Button';

export function Navbar() {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <nav className="p-4 bg-gray-800 text-white">
      <div className="flex justify-between items-center">
        <h1>Logo</h1>
        <Button onClick={() => setIsOpen(!isOpen)}>
          Menu
        </Button>
      </div>
    </nav>
  );
}`;

interface CodeViewerProps {
    code?: string;
    language?: string;
    onLineSelect?: (lineNumber: number) => void;
    selectedLine?: number | null;
}

export function CodeViewer({
    code = MOCK_CODE,
    language = "typescript",
    onLineSelect,
    selectedLine
}: CodeViewerProps) {
    const lines = code.split("\n");

    const isPlaceholder = code === "// Select a file to view code" || !code;

    if (isPlaceholder) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-[#0d0d0d] text-muted-foreground p-8">
                <div className="max-w-md text-center space-y-6">
                    <div className="relative w-20 h-20 mx-auto mb-6 group">
                        <div className="absolute inset-0 bg-primary/20 rounded-xl rotate-6 group-hover:rotate-12 transition-transform duration-500"></div>
                        <div className="absolute inset-0 bg-primary/20 rounded-xl -rotate-6 group-hover:-rotate-12 transition-transform duration-500"></div>
                        <div className="relative bg-secondary border border-border rounded-xl w-full h-full flex items-center justify-center shadow-2xl">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="32"
                                height="32"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="text-primary"
                            >
                                <polyline points="16 18 22 12 16 6" />
                                <polyline points="8 6 2 12 8 18" />
                            </svg>
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                        Ready to Explore?
                    </h2>

                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Select a file from the explorer on the left to view its source code and get instant AI-powered explanations.
                    </p>

                    <div className="grid grid-cols-2 gap-4 text-xs pt-4">
                        <div className="bg-secondary/20 p-3 rounded border border-border/50">
                            <span className="block font-semibold text-foreground mb-1">Browse</span>
                            Recursive file navigation
                        </div>
                        <div className="bg-secondary/20 p-3 rounded border border-border/50">
                            <span className="block font-semibold text-foreground mb-1">Explain</span>
                            Line-by-line AI insights
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-[#0d0d0d]">
            <div className="p-3 border-b border-border bg-secondary/10 flex justify-between items-center">
                <span className="text-xs font-mono text-muted-foreground uppercase">{language}</span>
                <span className="text-xs text-muted-foreground">{lines.length} lines</span>
            </div>

            <div className="flex-1 overflow-auto font-mono text-sm relative">
                <div className="min-w-fit">
                    {lines.map((line, i) => {
                        const lineNum = i + 1;
                        const isSelected = selectedLine === lineNum;

                        return (
                            <div
                                key={i}
                                className={cn(
                                    "flex group hover:bg-muted/20 cursor-pointer transition-colors duration-200",
                                    isSelected && "bg-primary/10 hover:bg-primary/15"
                                )}
                                onClick={() => onLineSelect?.(lineNum)}
                            >
                                {/* Line Number */}
                                <div className={cn(
                                    "w-12 pr-4 text-right text-muted-foreground/50 select-none border-r border-border/10 bg-secondary/5 group-hover:text-muted-foreground/80",
                                    isSelected && "text-primary border-primary/30"
                                )}>
                                    {lineNum}
                                </div>

                                {/* Code Content */}
                                <div className="pl-4 pr-10 whitespace-pre text-foreground/90 py-0.5 font-normal">
                                    {line}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// Very basic syntax highlighter visualization helper (temporary)
function colorize(text: string) {
    return text
        .replace(/(import|export|function|const|return|from)/g, '<span class="text-purple-400">$1</span>')
        .replace(/('.*?')/g, '<span class="text-green-400">$1</span>')
        .replace(/(".*?")/g, '<span class="text-green-400">$1</span>')
        .replace(/(\{|\}|\(|\)|\[|\])/g, '<span class="text-yellow-500">$1</span>')
        .replace(/\b(React|useState|Button|div|nav|h1)\b/g, '<span class="text-blue-400">$1</span>');
}
