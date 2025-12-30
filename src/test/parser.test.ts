import * as assert from 'assert';
import { parseRules } from '../logic/parser';

suite('Logic - Parser', () => {

    test('Parses valid JSON into Rule objects', () => {
        const json = `[
            { "Path": "src", "Status": "allow" },
            { "Path": "test", "Status": "deny" }
        ]`;
        
        const result = parseRules(json);
        
        assert.strictEqual(result.rules.length, 2);
        assert.strictEqual(result.rules[0].Path, 'src');
        assert.strictEqual(result.rules[0].index, 0);
        assert.strictEqual(result.rules[1].Status, 'deny');
        assert.strictEqual(result.rules[1].index, 1);
        assert.strictEqual(result.error, undefined);
    });

    test('Handles JSON syntax errors gracefully', () => {
        const json = `[ { "Path": "src", "Status" ... BROKEN ...`;
        const result = parseRules(json);
        assert.ok(result.error, 'Should return an error message');
        assert.strictEqual(result.rules.length, 0);
    });

    test('Normalizes paths during parse', () => {
        const json = `[{ "Path": "./src\\\\windows", "Status": "allow" }]`;
        const result = parseRules(json);
        assert.strictEqual(result.rules[0].Path, 'src/windows');
    });

    test('Detects duplicate paths and warns', () => {
        const json = `[
            { "Path": "src", "Status": "allow" },
            { "Path": "src", "Status": "deny" }
        ]`;
        
        const result = parseRules(json);
        
        // Both rules should exist (resolver handles the logic), but we expect a warning
        assert.strictEqual(result.rules.length, 2);
        assert.strictEqual(result.warnings.length, 1);
        assert.ok(result.warnings[0].includes('Duplicate path detected'));
    });
});