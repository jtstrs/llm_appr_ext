export type Status = 'allow' | 'deny';

export interface RawRule {
    Path: string;
    Status: Status;
}

export interface Rule {
    Path: string;   // Normalized path
    Status: Status;
    index: number;  // Position in the JSON file (0-based)
}

export interface ParseResult {
    rules: Rule[];
    warnings: string[]; // For UI notifications (e.g., duplicate paths)
    error?: string;     // Critical parsing errors
}