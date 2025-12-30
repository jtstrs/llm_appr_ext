import * as assert from 'assert';
import { resolveStatus } from '../logic/resolver';
import { Rule } from '../config/types';

suite('Logic - Resolver', () => {

    const rules: Rule[] = [
        { Path: 'src', Status: 'allow', index: 0 },
        { Path: 'src/secret', Status: 'deny', index: 1 },
        { Path: 'docs', Status: 'allow', index: 2 },
        { Path: 'readme.md', Status: 'allow', index: 3 },
    ];

    test('Returns undefined for unmatched paths', () => {
        const status = resolveStatus('package.json', rules);
        assert.strictEqual(status, 'undefined');
    });

    test('Exact match returns rule status', () => {
        const status = resolveStatus('readme.md', rules);
        assert.strictEqual(status, 'allow');
    });

    test('Inheritance: Child inherits from parent folder', () => {
        // "src/utils.ts" should inherit "src" (allow)
        const status = resolveStatus('src/utils.ts', rules);
        assert.strictEqual(status, 'allow');
    });

    test('Override: Specific subfolder overrides parent', () => {
        // "src" is allow, but "src/secret" is deny.
        // File "src/secret/api_key.txt" matches both.
        // "src/secret" is longer (more specific) -> Deny should win.
        const status = resolveStatus('src/secret/api_key.txt', rules);
        assert.strictEqual(status, 'deny');
    });

    test('Deep nesting respects specificity', () => {
        const deepRules: Rule[] = [
            { Path: 'a', Status: 'allow', index: 0 },
            { Path: 'a/b', Status: 'deny', index: 1 },
            { Path: 'a/b/c', Status: 'allow', index: 2 }
        ];

        assert.strictEqual(resolveStatus('a/file.txt', deepRules), 'allow');
        assert.strictEqual(resolveStatus('a/b/file.txt', deepRules), 'deny');
        assert.strictEqual(resolveStatus('a/b/c/file.txt', deepRules), 'allow');
    });

    test('Conflict: Same path, later index wins', () => {
        const conflictRules: Rule[] = [
            { Path: 'config', Status: 'allow', index: 0 },
            { Path: 'config', Status: 'deny', index: 1 } // Defined later
        ];

        // Length is equal, so Index decides.
        const status = resolveStatus('config/settings.json', conflictRules);
        assert.strictEqual(status, 'deny');
    });

    test('Handles Windows path inputs against Unix rules', () => {
        // Input path from VS Code might be windows style
        const status = resolveStatus('src\\secret\\file.ts', rules);
        assert.strictEqual(status, 'deny');
    });
});