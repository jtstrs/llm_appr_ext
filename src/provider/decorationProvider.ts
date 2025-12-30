import * as vscode from 'vscode';
import * as path from 'path';
import { Rule } from '../config/types';
import { resolveStatus } from '../logic/resolver';

export class LLMDecorationProvider implements vscode.FileDecorationProvider {
    private rules: Rule[] = [];
    
    // Event emitter to trigger UI updates
    private _onDidChangeFileDecorations = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();
    readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;

    /**
     * Called by extension.ts when the JSON config changes
     */
    public updateRules(newRules: Rule[]) {
        this.rules = newRules;
        // Refresh all decorations
        this._onDidChangeFileDecorations.fire(undefined);
    }

    /**
     * The Core Integration: Called by VS Code for every file in the explorer
     */
    provideFileDecoration(uri: vscode.Uri): vscode.ProviderResult<vscode.FileDecoration> {
        // 1. Only handle actual files (ignore git diffs, settings views, etc.)
        if (uri.scheme !== 'file') {
            return undefined;
        }

        // 2. Get the workspace folder to calculate the relative path
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        if (!workspaceFolder) {
            return undefined;
        }

        // 3. Calculate path relative to the workspace root
        // Example: /Users/me/project/src/index.ts -> src/index.ts
        const relativePath = path.relative(workspaceFolder.uri.fsPath, uri.fsPath);

        // 4. Ask the Resolver for the status
        // (Note: resolveStatus handles normalization of backslashes internally)
        const status = resolveStatus(relativePath, this.rules);

        // 5. Return the visual decoration based on status
        if (status === 'allow') {
            return new vscode.FileDecoration(
                '✅', // Badge text (1-2 chars)
                'LLM: Allowed' // Tooltip
            );
        } 
        
        if (status === 'deny') {
            return new vscode.FileDecoration(
                '❌', // Badge text
                'LLM: Denied' // Tooltip
            );
        }

        // 'undefined' status means no rule matched -> No decoration
        return undefined;
    }
}