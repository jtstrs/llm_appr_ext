import * as path from 'path';

export type Status = 'allow' | 'deny';

export interface RawRule {
    path: string;
    status: string;
    momment?: string;
}

export interface ProcessedRule {
    normalizedPath: string; // trimmed, standardized separators
    status: Status;
    comment?: string;
    originalIndex: number;
    pathLength: number;
}

export class RuleEngine {
    private rules: ProcessedRule[] = [];

    // Returns a list of conflict messages if any
    public parseConfig(rawJson: RawRule[]): string[] {
        const warnings: string[] = [];
        const seenPaths = new Set<string>();
        
        this.rules = rawJson.map((r, index) => {
            // Validate Enum
            if (r.Status !== 'allow' && r.Status !== 'deny') return null;
            if (!r.Path) return null;

            const normalized = r.Path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, ''); // Normalize slashes and trim

            // Detect Conflict
            if (seenPaths.has(normalized)) {
                warnings.push(`Conflict detected for path '${r.Path}'. Using the last defined status.`);
            }
            seenPaths.add(normalized);

            return {
                normalizedPath: normalized,
                status: r.Status as Status,
                comment: r.Comment,
                originalIndex: index,
                pathLength: normalized.length
            };
        }).filter((r): r is ProcessedRule => r !== null);

        return warnings;
    }

    public getStatus(relativePath: string): ProcessedRule | undefined {
        const normalizedTarget = relativePath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');

        const matches = this.rules.filter(rule => {
            // Exact match OR directory parent match
            // e.g. Rule: "src/utils" matches "src/utils/file.ts"
            // We append '/' to rule to ensure "src/util" doesn't match "src/utils"
            return normalizedTarget === rule.normalizedPath || 
                   normalizedTarget.startsWith(rule.normalizedPath + '/');
        });

        if (matches.length === 0) return undefined;

        // Sort: Longest Path First, then Highest Index First
        matches.sort((a, b) => {
            if (b.pathLength !== a.pathLength) {
                return b.pathLength - a.pathLength;
            }
            return b.originalIndex - a.originalIndex;
        });

        return matches[0];
    }
}