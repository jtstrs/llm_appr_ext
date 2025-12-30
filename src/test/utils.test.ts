import * as assert from 'assert';
import { normalizePath } from '../logic/utils';

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
});