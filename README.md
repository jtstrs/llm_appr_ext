# LLM Governance Viewer

A Visual Studio Code extension that visually indicates which files are allowed or denied for Cloud LLM usage within the VS Code File Explorer based on a configuration file.

## Overview

**Extension Name:** LLM Governance Viewer
**Internal Name:** `llm-governance-viewer`
**Purpose:** Provide visual indicators in the VS Code File Explorer to manage data governance and prevent unintended data leakage to Cloud LLMs.
**Target Audience:** Developers working in strict compliance environments where sensitive data exposure to Cloud LLMs must be carefully managed.

## Features

- **Visual File Status Indicators:** Displays badges and tooltips in the File Explorer showing whether files are allowed or denied for LLM usage
- **Automatic Activation:** Activates only when `llm_approvements.json` is present in your workspace
- **Real-Time Updates:** Watches for changes to the configuration file and updates decorations immediately
- **Smart Path Resolution:** Handles directory inheritance with intelligent priority-based rule matching
- **Validation & Warnings:** Provides helpful error messages for invalid configurations and duplicate rules

## Installation

1. Clone this repository or download the extension
2. Open the extension directory in VS Code
3. Run `npm install` to install dependencies
4. Press `F5` to launch the Extension Development Host
5. Open a workspace and create an `llm_approvements.json` file in the root

## Activation Strategy

The extension is designed to be lightweight and unobtrusive:

- **Activation Trigger:** The extension only activates when `llm_approvements.json` exists in the workspace root
- **Resource Usage:** If the file is not present, the extension remains dormant and consumes no resources
- **VS Code API:** Uses `activationEvents: ["workspaceContains:llm_approvements.json"]`

## Configuration File Schema

The extension reads `llm_approvements.json` from your workspace root.

### JSON Format

Array of rule objects with the following fields:

- **`Path`** (Required): Relative path to a file or directory from the workspace root
- **`Status`** (Required): Enum value - either `"allow"` or `"deny"`
- **`Comment`** (Optional): String for describing the context or reason for the rule

### Example Configuration

```json
[
  {
    "Path": "src/utils",
    "Status": "allow",
    "Comment": "Utility functions are usually generic"
  },
  {
    "Path": "src/utils/secrets.ts",
    "Status": "deny",
    "Comment": "Contains API keys"
  },
  {
    "Path": "config/production.json",
    "Status": "deny",
    "Comment": "Production configuration with sensitive data"
  },
  {
    "Path": "docs",
    "Status": "allow",
    "Comment": "Documentation is safe to share"
  }
]
```

## Functional Logic & Rules

### State Definitions

1. **Allowed:** Explicitly marked with `"Status": "allow"` - displays green checkmark ✅
2. **Denied:** Explicitly marked with `"Status": "deny"` - displays red cross ❌
3. **Not Defined:** No rule covers the file - no decoration displayed (default VS Code appearance)

### Resolution Algorithm (Priority Logic)

When determining the status of a file (e.g., `src/data/config.json`), the extension uses the following precedence:

#### 1. Path Matching & Inheritance

- Rules can apply to directories. A rule for `src/` implies all children inherit that status
- **More Specific Path Wins:** If `src/` is `allow` but `src/secrets/` is `deny`, files inside `src/secrets/` take the `deny` status
- Priority is determined by path length: longer (more specific) paths have higher priority

#### 2. Conflict Resolution (Same Specificity)

If the JSON contains multiple rules for the exact same `Path`:

- **Last Rule Wins:** The last defined rule in the JSON array takes precedence
- **Warning Notification:** A VS Code warning notification is displayed:
  *"Duplicate path detected: '{Path}'. Rule at index {N} overrides rule at index {M}."*

#### 3. Resolution Example

Given the configuration:
```json
[
  { "Path": "src", "Status": "allow" },
  { "Path": "src/secrets", "Status": "deny" },
  { "Path": "src/secrets/dev.json", "Status": "allow" }
]
```

Results:
- `src/utils.ts` → **Allowed** (matches `src`)
- `src/secrets/api-key.ts` → **Denied** (matches `src/secrets`, more specific than `src`)
- `src/secrets/dev.json` → **Allowed** (exact match, most specific)
- `README.md` → **Not Defined** (no matching rule)

### File Watcher

The extension monitors `llm_approvements.json` for changes:

- **On Modification:** Re-parses rules and refreshes all file explorer decorations immediately
- **On Creation:** Loads the configuration and applies decorations
- **On Deletion:** Clears all rules and removes decorations

## Visual Indicators (File Decorations)

The extension uses the VS Code `FileDecorationProvider` API to render visual cues in the File Explorer.

### Status: Allowed

- **Badge:** ✅ (green checkmark)
- **Tooltip:** `LLM: Allowed`

### Status: Denied

- **Badge:** ❌ (red cross)
- **Tooltip:** `LLM: Denied`

### Status: Not Defined

- **Badge:** None
- **Tooltip:** None (standard VS Code behavior)

## Error Handling

### JSON Syntax Error

If `llm_approvements.json` contains invalid JSON:
- **Notification:** Error message displayed: *"LLM Config Error: Invalid JSON syntax."*
- **Behavior:** Stops providing decorations until fixed

### Invalid Status Value

If a `Status` field is not `"allow"` or `"deny"`:
- **Notification:** Warning message: *"Item at index {N} has invalid Status '{value}'. Must be 'allow' or 'deny'. Skipped."*
- **Behavior:** Skips that specific rule, continues processing others

### Missing Required Fields

If an entry is missing `Path` or `Status`:
- **Notification:** Warning message: *"Item at index {N} is missing Path or Status. Skipped."*
- **Behavior:** Skips that specific rule, continues processing others

### Duplicate Paths

If multiple rules define the same path:
- **Notification:** Warning message: *"Duplicate path detected: '{path}'. Rule at index {N} overrides rule at index {M}."*
- **Behavior:** Uses the last defined rule (highest index)

## Technical Architecture

### Data Structures

```typescript
type Status = 'allow' | 'deny';

interface Rule {
    Path: string;      // Normalized path
    Status: Status;    // 'allow' or 'deny'
    index: number;     // Original position in JSON (for conflict resolution)
}

interface ParseResult {
    rules: Rule[];
    warnings: string[];  // UI notifications (e.g., duplicate paths)
    error?: string;      // Critical parsing errors
}
```

### Core Components

1. **Parser (`src/logic/parser.ts`):**
   - Validates and parses JSON
   - Normalizes paths (handles Windows/Unix separators)
   - Detects duplicate paths and generates warnings

2. **Resolver (`src/logic/resolver.ts`):**
   - Determines file status based on rules
   - Implements priority logic (specificity > definition order)
   - Returns 'allow', 'deny', or 'undefined'

3. **Decoration Provider (`src/provider/decorationProvider.ts`):**
   - Implements VS Code's `FileDecorationProvider` interface
   - Calculates relative paths from workspace root
   - Applies visual decorations based on resolved status

4. **Utils (`src/logic/utils.ts`):**
   - Path normalization (backslash → forward slash, trim leading/trailing slashes)
   - Ensures consistent path comparison across platforms

### Extension Lifecycle

1. **Activation:** Triggered when `llm_approvements.json` is found in workspace
2. **Initialization:** Registers decoration provider with VS Code
3. **Config Loading:** Reads and parses `llm_approvements.json`
4. **Rule Application:** Updates provider with parsed rules
5. **File Watching:** Monitors config file for changes
6. **Decoration Rendering:** VS Code calls `provideFileDecoration()` for each file in explorer

## Development

### Build & Run

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Run tests
npm test

# Watch mode (auto-recompile on changes)
npm run watch

# Package for production
npm run package
```

### Testing

The extension includes comprehensive unit tests for:
- Parser logic (valid/invalid JSON, duplicate detection)
- Resolver algorithm (priority rules, inheritance)
- Path normalization utilities

Run tests with:
```bash
npm test
```

## Known Limitations

- The extension only monitors the `llm_approvements.json` file in the workspace root
- Decorations apply to the VS Code File Explorer only (not visible in editor tabs)
- Maximum of one configuration file per workspace

## Contributing

Contributions are welcome! Please ensure:
1. All tests pass (`npm test`)
2. Code follows the existing TypeScript style
3. New features include corresponding unit tests
4. Documentation is updated to reflect changes

## License

The MIT License (MIT)

Copyright (c) 2025 Alexey Simakov

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Release Notes

### 0.0.1 (Initial Release)

- Basic file decoration support
- Configuration file parsing with validation
- Real-time file watching
- Priority-based rule resolution
- Error and warning notifications
