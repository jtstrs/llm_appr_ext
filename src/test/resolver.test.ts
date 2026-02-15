import * as assert from 'assert';
import { resolveStatus } from '../logic/resolver';
import { Rule } from '../config/types';

suite('Logic - Resolver', () => {

    const rules: Rule[] = [
        { Path: 'src', Status: 'allow', index: 0, isGlob: false },
        { Path: 'src/secret', Status: 'deny', index: 1, isGlob: false },
        { Path: 'docs', Status: 'allow', index: 2, isGlob: false },
        { Path: 'readme.md', Status: 'allow', index: 3, isGlob: false },
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
            { Path: 'a', Status: 'allow', index: 0, isGlob: false },
            { Path: 'a/b', Status: 'deny', index: 1, isGlob: false },
            { Path: 'a/b/c', Status: 'allow', index: 2, isGlob: false }
        ];

        assert.strictEqual(resolveStatus('a/file.txt', deepRules), 'allow');
        assert.strictEqual(resolveStatus('a/b/file.txt', deepRules), 'deny');
        assert.strictEqual(resolveStatus('a/b/c/file.txt', deepRules), 'allow');
    });

    test('Conflict: Same path, later index wins', () => {
        const conflictRules: Rule[] = [
            { Path: 'config', Status: 'allow', index: 0, isGlob: false },
            { Path: 'config', Status: 'deny', index: 1, isGlob: false } // Defined later
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

    // Glob Pattern Tests
    test('Glob: **/*.test.ts matches nested test files', () => {
        const globRules: Rule[] = [
            { Path: '**/*.test.ts', Status: 'deny', index: 0, isGlob: true }
        ];

        assert.strictEqual(resolveStatus('utils.test.ts', globRules), 'deny');
        assert.strictEqual(resolveStatus('src/utils.test.ts', globRules), 'deny');
        assert.strictEqual(resolveStatus('src/deep/nested/parser.test.ts', globRules), 'deny');
        assert.strictEqual(resolveStatus('src/utils.ts', globRules), 'undefined');
    });

    test('Glob: tests/** matches directory contents', () => {
        const globRules: Rule[] = [
            { Path: 'tests/**', Status: 'allow', index: 0, isGlob: true }
        ];

        assert.strictEqual(resolveStatus('tests/unit.ts', globRules), 'allow');
        assert.strictEqual(resolveStatus('tests/nested/deep/file.ts', globRules), 'allow');
        assert.strictEqual(resolveStatus('src/file.ts', globRules), 'undefined');
    });

    test('Glob: src/*.ts matches single level only', () => {
        const globRules: Rule[] = [
            { Path: 'src/*.ts', Status: 'allow', index: 0, isGlob: true }
        ];

        assert.strictEqual(resolveStatus('src/utils.ts', globRules), 'allow');
        assert.strictEqual(resolveStatus('src/parser.ts', globRules), 'allow');
        assert.strictEqual(resolveStatus('src/nested/utils.ts', globRules), 'undefined');
    });

    test('Glob: *.env* matches dotfiles', () => {
        const globRules: Rule[] = [
            { Path: '*.env*', Status: 'deny', index: 0, isGlob: true }
        ];

        assert.strictEqual(resolveStatus('.env', globRules), 'deny');
        assert.strictEqual(resolveStatus('.env.local', globRules), 'deny');
        assert.strictEqual(resolveStatus('.env.production', globRules), 'deny');
        assert.strictEqual(resolveStatus('config.ts', globRules), 'undefined');
    });

    test('Glob: Literal rule beats glob when longer path', () => {
        const mixedRules: Rule[] = [
            { Path: '**/*.ts', Status: 'allow', index: 0, isGlob: true },
            { Path: 'src/secret/api.ts', Status: 'deny', index: 1, isGlob: false }
        ];

        // Literal path "src/secret/api.ts" (16 chars) beats glob "**/*.ts" (7 chars)
        assert.strictEqual(resolveStatus('src/secret/api.ts', mixedRules), 'deny');
        assert.strictEqual(resolveStatus('src/utils.ts', mixedRules), 'allow');
    });

    test('Glob: Multiple globs - longer pattern wins', () => {
        const globRules: Rule[] = [
            { Path: '**/*.ts', Status: 'allow', index: 0, isGlob: true },
            { Path: 'src/**/*.test.ts', Status: 'deny', index: 1, isGlob: true }
        ];

        // "src/**/*.test.ts" (16 chars) beats "**/*.ts" (7 chars)
        assert.strictEqual(resolveStatus('src/utils.test.ts', globRules), 'deny');
        assert.strictEqual(resolveStatus('src/utils.ts', globRules), 'allow');
        assert.strictEqual(resolveStatus('tests/file.test.ts', globRules), 'allow');
    });

    test('Glob: Same-length patterns - later index wins', () => {
        const globRules: Rule[] = [
            { Path: 'src/**/*.ts', Status: 'allow', index: 0, isGlob: true },
            { Path: 'src/**/*.ts', Status: 'deny', index: 1, isGlob: true }
        ];

        // Same length, later index wins
        assert.strictEqual(resolveStatus('src/utils.ts', globRules), 'deny');
    });

    test('Glob: Brace expansion *.{ts,js} works', () => {
        const globRules: Rule[] = [
            { Path: '*.{ts,js}', Status: 'allow', index: 0, isGlob: true }
        ];

        assert.strictEqual(resolveStatus('file.ts', globRules), 'allow');
        assert.strictEqual(resolveStatus('file.js', globRules), 'allow');
        assert.strictEqual(resolveStatus('file.py', globRules), 'undefined');
    });

    test('Glob: Character classes [0-9] work', () => {
        const globRules: Rule[] = [
            { Path: 'file[0-9].ts', Status: 'deny', index: 0, isGlob: true }
        ];

        assert.strictEqual(resolveStatus('file1.ts', globRules), 'deny');
        assert.strictEqual(resolveStatus('file9.ts', globRules), 'deny');
        assert.strictEqual(resolveStatus('fileA.ts', globRules), 'undefined');
    });

    test('Glob: Question mark ? works', () => {
        const globRules: Rule[] = [
            { Path: 'file?.ts', Status: 'allow', index: 0, isGlob: true }
        ];

        assert.strictEqual(resolveStatus('file1.ts', globRules), 'allow');
        assert.strictEqual(resolveStatus('fileA.ts', globRules), 'allow');
        assert.strictEqual(resolveStatus('file12.ts', globRules), 'undefined');
    });

    test('Glob: Windows backslash input with glob rules', () => {
        const globRules: Rule[] = [
            { Path: 'src/**/*.ts', Status: 'allow', index: 0, isGlob: true }
        ];

        // Windows path input should be normalized and match glob
        assert.strictEqual(resolveStatus('src\\nested\\file.ts', globRules), 'allow');
    });

    test('Backward compatibility: exact match still works', () => {
        const literalRules: Rule[] = [
            { Path: 'readme.md', Status: 'allow', index: 0, isGlob: false }
        ];

        assert.strictEqual(resolveStatus('readme.md', literalRules), 'allow');
    });

    test('Backward compatibility: parent match still works', () => {
        const literalRules: Rule[] = [
            { Path: 'src', Status: 'allow', index: 0, isGlob: false }
        ];

        assert.strictEqual(resolveStatus('src/utils.ts', literalRules), 'allow');
    });

    test('Backward compatibility: root catch-all still works', () => {
        const literalRules: Rule[] = [
            { Path: '', Status: 'deny', index: 0, isGlob: false }
        ];

        assert.strictEqual(resolveStatus('any/file.ts', literalRules), 'deny');
    });
});