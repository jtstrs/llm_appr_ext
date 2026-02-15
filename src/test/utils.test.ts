import * as assert from 'assert';
import { normalizePath, isGlobPattern } from '../logic/utils';

suite('Logic - Utils', () => {

    test('normalizePath converts backslashes to forward slashes', () => {
        const input = 'src\\components\\header.ts';
        const expected = 'src/components/header.ts';
        assert.strictEqual(normalizePath(input), expected);
    });

    test('normalizePath removes leading slashes and dot-slashes', () => {
        assert.strictEqual(normalizePath('./src/file.ts'), 'src/file.ts');
        assert.strictEqual(normalizePath('/src/file.ts'), 'src/file.ts');
        assert.strictEqual(normalizePath('.\\src\\file.ts'), 'src/file.ts');
    });

    test('normalizePath removes trailing slashes', () => {
        assert.strictEqual(normalizePath('src/folder/'), 'src/folder');
    });

    test('normalizePath handles mixed separators', () => {
        assert.strictEqual(normalizePath('src\\folder/subfolder\\file.ts'), 'src/folder/subfolder/file.ts');
    });

    test('isGlobPattern detects * wildcard', () => {
        assert.strictEqual(isGlobPattern('**/*.ts'), true);
        assert.strictEqual(isGlobPattern('src/*.js'), true);
        assert.strictEqual(isGlobPattern('*.env*'), true);
    });

    test('isGlobPattern detects ? single char wildcard', () => {
        assert.strictEqual(isGlobPattern('file?.ts'), true);
        assert.strictEqual(isGlobPattern('src/test?.js'), true);
    });

    test('isGlobPattern detects [ character class', () => {
        assert.strictEqual(isGlobPattern('file[0-9].ts'), true);
        assert.strictEqual(isGlobPattern('[a-z]*.js'), true);
    });

    test('isGlobPattern detects { brace expansion', () => {
        assert.strictEqual(isGlobPattern('*.{ts,js}'), true);
        assert.strictEqual(isGlobPattern('src/{a,b}/file.ts'), true);
    });

    test('isGlobPattern returns false for literal paths', () => {
        assert.strictEqual(isGlobPattern('src/utils.ts'), false);
        assert.strictEqual(isGlobPattern('src'), false);
        assert.strictEqual(isGlobPattern('readme.md'), false);
        assert.strictEqual(isGlobPattern('src/folder/subfolder'), false);
    });
});