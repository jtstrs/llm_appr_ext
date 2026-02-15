import { Rule, ParseResult } from '../config/types';
import { normalizePath, isGlobPattern } from './utils';

export function parseRules(jsonString: string): ParseResult {
    const result: ParseResult = {
        rules: [],
        warnings: []
    };

    if (!jsonString || jsonString.trim() === '') {
        return result;
    }

    let rawData: any;

    try {
        rawData = JSON.parse(jsonString);
    } catch (e) {
        result.error = 'Invalid JSON syntax.';
        return result;
    }

    if (!Array.isArray(rawData)) {
        result.error = 'Root element must be an array of rules.';
        return result;
    }

    // Temporary map to detect duplicates for warning purposes
    const pathSeen = new Map<string, number>();

    rawData.forEach((item: any, index: number) => {
        // Basic schema validation
        if (typeof item.Path !== 'string' || typeof item.Status !== 'string') {
            result.warnings.push(`Item at index ${index} is missing Path or Status. Skipped.`);
            return;
        }

        const statusLower = item.Status.toLowerCase();
        if (statusLower !== 'allow' && statusLower !== 'deny') {
            result.warnings.push(`Item at index ${index} has invalid Status '${item.Status}'. Must be 'allow' or 'deny'. Skipped.`);
            return;
        }

        const normPath = normalizePath(item.Path);
        const isGlob = isGlobPattern(normPath);

        // Conflict Detection (skip for glob patterns - overlapping globs are expected)
        if (!isGlob && pathSeen.has(normPath)) {
            const previousIndex = pathSeen.get(normPath);
            result.warnings.push(`Duplicate path detected: "${normPath}". Rule at index ${index} overrides rule at index ${previousIndex}.`);
        }

        pathSeen.set(normPath, index);

        const rule: Rule = {
            Path: normPath,
            Status: statusLower as 'allow' | 'deny',
            index: index,
            isGlob: isGlob
        };

        result.rules.push(rule);
    });

    return result;
}