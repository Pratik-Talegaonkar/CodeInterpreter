"use client";

import { useState, useCallback } from "react";
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Loader2, Github } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared type (frontend version)
export type FileNode = {
    id: string; // Base64 encoded path
    name: string;
    type: "file" | "folder";
    children?: FileNode[];
    language?: string;
    path: string; // Absolute path
};

interface FileExplorerProps {
    files?: FileNode[]; // Deprecated, but keeping for prop compat if needed initially
    onFileSelect?: (file: FileNode) => void;
    selectedFileId?: string;
}

export function FileExplorer({
    onFileSelect,
    selectedFileId
}: FileExplorerProps) {
    const [mode, setMode] = useState<'local' | 'github'>('local');
    const [repoUrl, setRepoUrl] = useState("");
    const [rootPath, setRootPath] = useState<string>("");
    const [rootFiles, setRootFiles] = useState<FileNode[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadDirectory = async (path: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/files', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path }),
            });

            if (!res.ok) throw new Error((await res.json()).error || 'Failed to load');

            const data = await res.json();
            return data.files as FileNode[];
        } catch (err: any) {
            setError(err.message);
            return [];
        } finally {
            setLoading(false);
        }
    };

    const handleSetRoot = async (e: React.FormEvent) => {
        e.preventDefault();

        if (mode === 'github') {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch('/api/github/clone', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ repoUrl }),
                });

                if (!res.ok) throw new Error((await res.json()).error || 'Clone failed');

                const data = await res.json();
                setRootPath(data.projectPath); // Store the temp path

                // Now load files from that path
                const files = await loadDirectory(data.projectPath);
                setRootFiles(files);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        } else {
            // Local mode
            const files = await loadDirectory(rootPath);
            setRootFiles(files);
        }
    };

    return (
        <div className="h-full bg-secondary/30 border-r border-border flex flex-col">
            {/* Path Input Header */}
            <div className="p-4 border-b border-border bg-secondary/10 space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Explorer</h2>
                    <div className="flex bg-background rounded-md border border-border p-0.5">
                        <button
                            onClick={() => setMode('local')}
                            className={cn("px-2 py-0.5 text-xs rounded-sm transition-colors", mode === 'local' ? "bg-primary text-primary-foreground shadow-sm" : "hover:text-foreground text-muted-foreground")}
                        >
                            Local
                        </button>
                        <button
                            onClick={() => setMode('github')}
                            className={cn("px-2 py-0.5 text-xs rounded-sm transition-colors", mode === 'github' ? "bg-primary text-primary-foreground shadow-sm" : "hover:text-foreground text-muted-foreground")}
                        >
                            GitHub
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSetRoot} className="flex gap-2">
                    <input
                        type="text"
                        placeholder={mode === 'local' ? "E:\\Code\\Project" : "https://github.com/user/repo"}
                        className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary"
                        value={mode === 'local' ? rootPath : repoUrl}
                        onChange={(e) => mode === 'local' ? setRootPath(e.target.value) : setRepoUrl(e.target.value)}
                    />
                    <button disabled={loading} type="submit" className="p-1 hover:bg-secondary rounded transition-colors text-primary hover:text-primary/80" title={mode === 'local' ? "Load Folder" : "Clone Repo"}>
                        {loading ? <Loader2 size={16} className="animate-spin" /> : (mode === 'local' ? <FolderOpen size={16} /> : <Github size={16} />)}
                    </button>
                </form>
                {error && <div className="text-xs text-red-500 break-all">{error}</div>}
                {mode === 'github' && rootPath && !loading && (
                    <div className="text-[10px] text-muted-foreground truncate">
                        Loaded: {repoUrl.split('/').slice(-1)[0]}
                    </div>
                )}
            </div>

            {/* File Tree */}
            <div className="flex-1 overflow-auto p-2">
                {rootFiles.length === 0 && !loading && (
                    <div className="text-xs text-muted-foreground text-center mt-10 p-4">
                        Enter an absolute path above to load files.
                    </div>
                )}

                {rootFiles.map((node) => (
                    <FileTreeNode
                        key={node.id}
                        node={node}
                        onSelect={onFileSelect}
                        selectedId={selectedFileId}
                        loadChildren={loadDirectory}
                    />
                ))}
            </div>
        </div>
    );
}

function FileTreeNode({
    node,
    level = 0,
    onSelect,
    selectedId,
    loadChildren
}: {
    node: FileNode;
    level?: number;
    onSelect?: (file: FileNode) => void;
    selectedId?: string;
    loadChildren: (path: string) => Promise<FileNode[]>;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [children, setChildren] = useState<FileNode[]>(node.children || []);
    const [loading, setLoading] = useState(false);
    const isSelected = node.id === selectedId;

    const handleClick = async () => {
        if (node.type === "folder") {
            if (!isOpen && children.length === 0) {
                setLoading(true);
                const loadedChildren = await loadChildren(node.path);
                setChildren(loadedChildren);
                setLoading(false);
            }
            setIsOpen(!isOpen);
        } else {
            onSelect?.(node);
        }
    };

    return (
        <div className="select-none">
            <div
                className={cn(
                    "flex items-center py-1 px-2 rounded-md cursor-pointer transition-colors duration-200",
                    isSelected ? "bg-primary/20 text-primary" : "hover:bg-muted/50 text-foreground/80",
                )}
                style={{ paddingLeft: `${level * 12 + 8}px` }}
                onClick={handleClick}
            >
                <span className="mr-2 opacity-70">
                    {node.type === "folder" ? (
                        loading ? <Loader2 size={14} className="animate-spin" /> :
                            (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />)
                    ) : (
                        <span className="w-3.5" /> // Spacer
                    )}
                </span>

                <span className="mr-2 text-muted-foreground">
                    {node.type === "folder" ? (
                        isOpen ? <FolderOpen size={16} /> : <Folder size={16} />
                    ) : (
                        <File size={16} />
                    )}
                </span>

                <span className="text-sm truncate">{node.name}</span>
            </div>

            {isOpen && (
                <div>
                    {children.map((child) => (
                        <FileTreeNode
                            key={child.id}
                            node={child}
                            level={level + 1}
                            onSelect={onSelect}
                            selectedId={selectedId}
                            loadChildren={loadChildren}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
