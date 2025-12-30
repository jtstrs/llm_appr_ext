import { Rule, Status } from '../config/types';
import { normalizePath } from './utils';

/**
 * Determines the status for a specific target path based on the rules provided.
 * Returns 'undefined' string if no rule covers the path.
 */
export function resolveStatus(targetPath: string, rules: Rule[]): Status | 'undefined' {
    const normalizedTarget = normalizePath(targetPath);

    // 1. Filter: Find rules that apply to this path
    // A rule applies if it IS the path, or if it is a PARENT of the path.
    const matches = rules.filter(r => {
        // Exact match (e.g., Rule: "src/utils.ts" matches File: "src/utils.ts")
        if (r.Path === normalizedTarget) return true;

        // Parent match (e.g., Rule: "src" matches File: "src/utils.ts")
        // Check if target starts with "rule path + /"
        if (normalizedTarget.startsWith(r.Path + '/')) return true;

        // Catch-all root match (empty string or matching root folder logic if needed)
        if (r.Path === '') return true;

        return false;
    });

    if (matches.length === 0) {
        return 'undefined';
    }

    // 2. Sort: Specificity (Length) > Definition Order (Index)
    matches.sort((a, b) => {
        // Primary: Length Descending (Longer path = more specific)
        const lenDiff = b.Path.length - a.Path.length;
        if (lenDiff !== 0) return lenDiff;

        // Secondary: Index Descending (Later definition overrides earlier)
        return b.index - a.index;
    });

    // 3. Pick: The top result is the winner
    return matches[0].Status;
}