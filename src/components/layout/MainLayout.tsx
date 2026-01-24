"use client";

import { useState } from "react";
import { FileExplorer, FileNode } from "@/components/explorer/FileExplorer";
import { CodeViewer } from "@/components/code/CodeViewer";
import { ExplanationPanel } from "@/components/explanation/ExplanationPanel";

import { ModeToggle } from "@/components/mode-toggle";

export function MainLayout() {
    const [selectedFileId, setSelectedFileId] = useState<string | undefined>();
    const [fileContent, setFileContent] = useState<string>("// Select a file to view code");
    const [fileLanguage, setFileLanguage] = useState<string>("plaintext");
    const [selectedLine, setSelectedLine] = useState<number | null>(null);
    const [filePath, setFilePath] = useState<string | undefined>();
    const [projectRoot, setProjectRoot] = useState<string | undefined>();

    const handleFileSelect = async (file: FileNode) => {
        setSelectedFileId(file.id);
        setSelectedLine(null);
        setFileContent("// Loading...");
        setFileLanguage(file.language || "plaintext");
        setFilePath(file.path);

        // Extract project root from file path (path to the first parent directory)
        // For example: e:\Coding\CodeInterpreter\test-project\main.ts -> e:\Coding\CodeInterpreter\test-project
        const pathParts = file.path.split(/[\\/]/);
        // Find the directory containing the file
        const rootPath = pathParts.slice(0, -1).join('\\');
        setProjectRoot(rootPath);

        try {
            const res = await fetch('/api/content', {
                method: 'POST',
                body: JSON.stringify({ path: file.path })
            });
            if (res.ok) {
                const data = await res.json();
                setFileContent(data.content);
            } else {
                setFileContent("// Failed to load file content");
            }
        } catch (e) {
            setFileContent("// Error loading file");
        }
    };

    const handleLineSelect = (lineNum: number) => {
        setSelectedLine(lineNum === selectedLine ? null : lineNum);
    };

    return (
        <div className="h-screen w-full flex overflow-hidden bg-background text-foreground transition-colors duration-300">
            {/* Sidebar - File Explorer */}
            <aside className="w-64 flex-shrink-0 flex flex-col border-r border-border">
                <div className="h-12 border-b border-border flex items-center justify-between px-4">
                    <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                        CodeAI
                    </span>
                    <ModeToggle />
                </div>
                <FileExplorer
                    onFileSelect={handleFileSelect}
                    selectedFileId={selectedFileId}
                />
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex min-w-0">
                {/* Code View */}
                <section className="flex-1 min-w-0 flex flex-col border-r border-border">
                    <CodeViewer
                        code={fileContent}
                        language={fileLanguage}
                        onLineSelect={handleLineSelect}
                        selectedLine={selectedLine}
                    />
                </section>

                {/* Explanations Panel */}
                <aside className="w-80 flex-shrink-0 bg-card">
                    <ExplanationPanel
                        selectedLine={selectedLine}
                        fileContent={fileContent}
                        fileLanguage={fileLanguage}
                        filePath={filePath}
                        projectRoot={projectRoot}
                    />
                </aside>
            </main>
        </div>
    );
}
