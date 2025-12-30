/**
 * Normalizes a path string to a standard format:
 * - Replaces backslashes with forward slashes.
 * - Removes leading './' or '/'.
 * - Removes trailing '/'.
 */
export function normalizePath(p: string): string {
    if (!p) return '';
    
    // 1. Replace Windows backslashes
    let normalized = p.replace(/\\/g, '/');

    // 2. Remove leading './' or '/'
    normalized = normalized.replace(/^\.\//, '').replace(/^\//, '');

    // 3. Remove trailing '/' (to standardize folder paths)
    normalized = normalized.replace(/\/$/, '');

    return normalized;
}