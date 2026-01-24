/**
 * Parser registry for managing language-specific parsers
 */

import { TypeScriptParser } from './typescript-parser';
import { PythonParser } from './python-parser';
import { JavaParser } from './java-parser';
import type { LanguageParser } from '../types';
import path from 'path';

/**
 * Registry of all available parsers
 */
class ParserRegistry {
    private parsers: Map<string, LanguageParser> = new Map();
    private extensionMap: Map<string, LanguageParser> = new Map();

    constructor() {
        this.registerDefaultParsers();
    }

    /**
     * Register default parsers for supported languages
     */
    private registerDefaultParsers(): void {
        const tsParser = new TypeScriptParser();
        const pyParser = new PythonParser();
        const javaParser = new JavaParser();

        this.register(tsParser);
        this.register(pyParser);
        this.register(javaParser);
    }

    /**
     * Register a parser
     */
    register(parser: LanguageParser): void {
        this.parsers.set(parser.language, parser);

        // Map extensions to parser
        for (const ext of parser.extensions) {
            this.extensionMap.set(ext, parser);
        }
    }

    /**
     * Get parser for a specific language
     */
    getByLanguage(language: string): LanguageParser | undefined {
        return this.parsers.get(language);
    }

    /**
     * Get parser for a file extension
     */
    getByExtension(extension: string): LanguageParser | undefined {
        const ext = extension.startsWith('.') ? extension.slice(1) : extension;
        return this.extensionMap.get(ext);
    }

    /**
     * Get parser for a file path
     */
    getByFilePath(filePath: string): LanguageParser | undefined {
        const ext = path.extname(filePath).slice(1);
        return this.getByExtension(ext);
    }

    /**
     * Check if a file is supported
     */
    isSupported(filePath: string): boolean {
        return this.getByFilePath(filePath) !== undefined;
    }

    /**
     * Get all supported extensions
     */
    getSupportedExtensions(): string[] {
        return Array.from(this.extensionMap.keys());
    }

    /**
     * Get all registered languages
     */
    getLanguages(): string[] {
        return Array.from(this.parsers.keys());
    }
}

// Export singleton instance
export const parserRegistry = new ParserRegistry();
