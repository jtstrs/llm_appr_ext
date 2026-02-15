# LLM Governance Viewer - Extension Analysis

## Project Identity

- **Name:** `llm-governance-viewer`
- **Display Name:** LLM Governance Viewer
- **Version:** 0.0.1
- **Publisher:** jetstr
- **Repository:** https://github.com/jtstrs/llm_appr_ext.git
- **Type:** VS Code Extension
- **Entry Point:** `dist/extension.js` (bundled by esbuild from `src/extension.ts`)

## Purpose

Provides visual file-level governance indicators (badges/tooltips) in the VS Code File Explorer. Files are marked as "allowed" or "denied" for Cloud LLM usage based on rules defined in a workspace-local `llm_approvements.json` configuration file. Targets compliance environments where sensitive data leakage to Cloud LLMs must be managed.

## Architecture

### Directory Structure

```
src/
  extension.ts              # VS Code entry point (activate/deactivate)
  config/
    types.ts                # Type definitions (Status, Rule, ParseResult)
  logic/
    parser.ts               # JSON config parsing and validation
    resolver.ts             # Rule resolution algorithm (path matching + priority)
    utils.ts                # Path normalization utility
  provider/
    decorationProvider.ts   # FileDecorationProvider implementation
  test/
    extension.test.ts       # Placeholder integration test
    parser.test.ts          # Parser unit tests (4 tests)
    resolver.test.ts        # Resolver unit tests (6 tests)
    utils.test.ts           # Utils unit tests (4 tests)
```

### Module Dependency Graph

```
extension.ts
  ├── logic/parser.ts
  │     ├── config/types.ts (Rule, ParseResult)
  │     └── logic/utils.ts (normalizePath)
  ├── provider/decorationProvider.ts
  │     ├── config/types.ts (Rule)
  │     └── logic/resolver.ts
  │           ├── config/types.ts (Rule, Status)
  │           └── logic/utils.ts (normalizePath)
  └── config/types.ts (Rule)
```

### Data Types

```typescript
type Status = 'allow' | 'deny';

interface Rule {
    Path: string;      // Normalized relative path (forward slashes, no leading/trailing slashes)
    Status: Status;
    index: number;     // 0-based position in the JSON array (used for conflict resolution)
}

interface ParseResult {
    rules: Rule[];
    warnings: string[];  // Non-fatal issues (duplicate paths, invalid entries)
    error?: string;      // Fatal parsing errors (invalid JSON, wrong root type)
}
```

## Core Components

### 1. Extension Entry Point (`src/extension.ts`)

**Activation:** `workspaceContains:llm_approvements.json` (declared in `package.json`).

**`activate()` flow:**
1. Creates `LLMDecorationProvider` instance
2. Registers it via `vscode.window.registerFileDecorationProvider()`
3. Defines `loadConfig()` async helper:
   - Finds `llm_approvements.json` via `vscode.workspace.findFiles()` (excludes `node_modules`)
   - Reads file content via `vscode.workspace.fs.readFile()` + `TextDecoder`
   - Calls `parseRules()` to get `ParseResult`
   - Shows error/warning notifications if parsing issues exist
   - Updates provider with `provider.updateRules(result.rules)`
4. Calls `loadConfig()` immediately
5. Sets up `FileSystemWatcher` on `**/llm_approvements.json`:
   - `onDidChange` / `onDidCreate` -> re-runs `loadConfig()`
   - `onDidDelete` -> clears rules via `provider.updateRules([])`
6. Pushes all disposables to `context.subscriptions`

**`deactivate()`:** Empty (no-op).

### 2. Parser (`src/logic/parser.ts`)

**Function:** `parseRules(jsonString: string): ParseResult`

**Algorithm:**
1. If input is empty/whitespace -> return empty result (no error)
2. `JSON.parse()` the string -> on failure, set `result.error = 'Invalid JSON syntax.'`
3. Validate root is an array -> on failure, set `result.error`
4. Iterate each item:
   - Skip if `Path` or `Status` is not a string (add warning)
   - Normalize Status to lowercase; skip if not `'allow'` or `'deny'` (add warning)
   - Normalize path via `normalizePath()`
   - Check duplicate detection via `Map<string, number>` keyed by normalized path (add warning on duplicate)
   - Push valid `Rule` to `result.rules` (duplicates are kept; resolver handles precedence)

**Key behavior:** Duplicate rules are NOT removed. Both are pushed to the rules array. The resolver handles which one wins. Warnings are generated for user notification.

### 3. Resolver (`src/logic/resolver.ts`)

**Function:** `resolveStatus(targetPath: string, rules: Rule[]): Status | 'undefined'`

**Algorithm:**
1. Normalize target path
2. Filter applicable rules:
   - Exact match: `rule.Path === normalizedTarget`
   - Parent match: `normalizedTarget.startsWith(rule.Path + '/')`
   - Root catch-all: `rule.Path === ''`
3. If no matches -> return `'undefined'`
4. Sort matches by:
   - **Primary:** Path length descending (longer = more specific = higher priority)
   - **Secondary:** Index descending (later definition wins on tie)
5. Return `matches[0].Status`

**Priority logic:** Specificity (path depth) > Definition order (last-wins). This means a `deny` rule on `src/secret` overrides an `allow` rule on `src`, regardless of which appears first in the JSON.

### 4. Path Normalization (`src/logic/utils.ts`)

**Function:** `normalizePath(p: string): string`

**Transformations (in order):**
1. Replace all `\` with `/`
2. Remove leading `./`
3. Remove leading `/`
4. Remove trailing `/`

Returns `''` for falsy input.

### 5. Decoration Provider (`src/provider/decorationProvider.ts`)

**Class:** `LLMDecorationProvider implements vscode.FileDecorationProvider`

**State:** `private rules: Rule[]`

**Methods:**
- `updateRules(newRules: Rule[])`: Replaces internal rules, fires `onDidChangeFileDecorations` (undefined = refresh all)
- `provideFileDecoration(uri: vscode.Uri)`: Called by VS Code per file in explorer:
  1. Skip non-`file://` URIs
  2. Get workspace folder, compute relative path via `path.relative()`
  3. Call `resolveStatus(relativePath, this.rules)`
  4. Return `FileDecoration('✅', 'LLM: Allowed')` for allow
  5. Return `FileDecoration('❌', 'LLM: Denied')` for deny
  6. Return `undefined` for unmatched (no decoration)

## Build System

- **Bundler:** esbuild (`esbuild.js`)
  - Entry: `src/extension.ts`
  - Output: `dist/extension.js` (CommonJS)
  - External: `vscode`
  - Production: minified, no sourcemaps
  - Dev: sourcemaps, not minified
  - Watch mode supported (`--watch` flag)
- **TypeScript:** `tsconfig.json` targets ES2022, module Node16, strict mode
- **Linting:** ESLint 9 with `typescript-eslint` (naming-convention, curly, eqeqeq, no-throw-literal, semi)
- **Testing:** `@vscode/test-cli` + `@vscode/test-electron`, Mocha-style suites, compiled to `out/` then run

## NPM Scripts

| Script | Purpose |
|--------|---------|
| `compile` | Type-check + lint + esbuild bundle |
| `watch` | Parallel esbuild watch + tsc watch |
| `package` | Production build (type-check + lint + minified bundle) |
| `compile-tests` | Compile tests to `out/` directory |
| `pretest` | compile-tests + compile + lint |
| `check-types` | `tsc --noEmit` |
| `lint` | `eslint src` |
| `test` | `vscode-test` (runs tests in VS Code instance) |

## Test Coverage

**14 total tests across 4 suites:**

- **Parser (4 tests):** Valid JSON parsing, syntax error handling, path normalization during parse, duplicate detection with warnings
- **Resolver (6 tests):** Unmatched paths return undefined, exact match, parent directory inheritance, specific subfolder override, deep nesting specificity, same-path conflict (later index wins), Windows path input handling
- **Utils (4 tests):** Backslash conversion, leading slash/dot-slash removal, trailing slash removal, mixed separator handling
- **Extension (1 test):** Placeholder sample test (not functional)

## Configuration File Format

**File:** `llm_approvements.json` (workspace root)

```json
[
  { "Path": "string", "Status": "allow|deny", "Comment": "optional string" }
]
```

- `Path`: Relative path to file or directory. Gets normalized (slashes, leading/trailing trimmed).
- `Status`: Case-insensitive `"allow"` or `"deny"`.
- `Comment`: Ignored by parser (not stored in Rule type). For human documentation only.

## Identified Gaps and Observations

1. **No `contributes` section in package.json:** The `"contributes"` field is empty `{}`. No commands, settings, or menus are registered. The extension operates purely through the FileDecorationProvider API and activation events.
2. **No glob/wildcard support:** Rules only match exact paths and parent directories. No `*.ts` or `**/*.json` pattern matching.
3. **Single workspace folder assumed:** `findFiles()` scans all workspace folders, but `provideFileDecoration()` uses the first matching workspace folder only. Multi-root workspaces are partially supported.
4. **No config schema validation:** No JSON schema is registered for `llm_approvements.json` (no IntelliSense/autocomplete in the config file).
5. **`Comment` field discarded:** The parser does not preserve `Comment` from the JSON. It could be useful for tooltip enrichment.
6. **String-based `'undefined'` return:** The resolver returns the string `'undefined'` rather than actual `undefined`, which is an unusual pattern.
7. **Test coverage gap:** `extension.test.ts` is a placeholder. No integration tests for the activation flow, file watcher behavior, or decoration provider.
8. **No `.vscodeignore` in repo:** Listed in `.gitignore` but not present. Needed for proper VSIX packaging to exclude `src/`, `node_modules/`, etc.
9. **`llm_approvements.json` in repo:** The sample config file is not gitignored and is tracked. This is a workspace-specific file that typically should not be in the extension repo itself.
10. **Root catch-all:** The resolver supports `Path: ""` as a catch-all root rule, but this behavior is not documented or tested.
