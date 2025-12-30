import * as vscode from 'vscode';
import { TextDecoder } from 'util';
import { parseRules } from './logic/parser';
import { LLMDecorationProvider } from './provider/decorationProvider';
import { Rule } from './config/types';

export async function activate(context: vscode.ExtensionContext) {
    console.log('LLM Governance Viewer is active.');

    // 1. Initialize the Decoration Provider
    const provider = new LLMDecorationProvider();
    
    // 2. Register the provider with VS Code
    const decorationRegistration = vscode.window.registerFileDecorationProvider(provider);
    context.subscriptions.push(decorationRegistration);

    // 3. Helper function to load and parse the config
    const loadConfig = async () => {
        const files = await vscode.workspace.findFiles('llm_approvements.json', '**/node_modules/**', 1);
        
        if (files.length === 0) {
            // Should not happen due to activationEvents, but good safety check
            return;
        }

        const uri = files[0];
        try {
            const rawData = await vscode.workspace.fs.readFile(uri);
            const content = new TextDecoder('utf-8').decode(rawData);
            
            const result = parseRules(content);

            // Notify user of parsing errors if any
            if (result.error) {
                vscode.window.showErrorMessage(`LLM Config Error: ${result.error}`);
            } else if (result.warnings.length > 0) {
                // Warning typically means duplicate paths - let's show the first one
                vscode.window.showWarningMessage(`LLM Config Warning: ${result.warnings[0]}`);
            }

            // Update the provider with new rules
            provider.updateRules(result.rules);

        } catch (error) {
            console.error('Failed to read llm_approvements.json', error);
        }
    };

    // 4. Initial Load
    await loadConfig();

    // 5. Watch for changes to the config file
    const watcher = vscode.workspace.createFileSystemWatcher('**/llm_approvements.json');
    
    watcher.onDidChange(() => loadConfig());
    watcher.onDidCreate(() => loadConfig());
    watcher.onDidDelete(() => {
        // If config is deleted, clear rules
        provider.updateRules([]);
    });

    context.subscriptions.push(watcher);
}

export function deactivate() {}