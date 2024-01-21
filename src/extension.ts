// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {fetchGPT3Response} from './openai-funcs';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';




async function applyChanges(originalUri: vscode.Uri, modifiedUri: vscode.Uri) {
    const modifiedDocument = await vscode.workspace.openTextDocument(modifiedUri);
    const originalDocument = await vscode.workspace.openTextDocument(originalUri);
    const edit = new vscode.WorkspaceEdit();
    edit.replace(
        originalUri,
        new vscode.Range(
            originalDocument.lineAt(0).range.start,
            originalDocument.lineAt(originalDocument.lineCount - 1).range.end
        ),
        modifiedDocument.getText()
    );
    await vscode.workspace.applyEdit(edit);
};

async function cleanupTempFile(filePath: string) {
    try {
        fs.unlinkSync(filePath);
    } catch (err) {
        console.error(`Error deleting temporary file: ${err}`);
    }
};




function runAutoLogging() {
	const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("No active editor.");
            return;
        }

        const document = editor.document;
        const entireCode = document.getText();

        // Prepare the prompt for OpenAI
        const prompt = `act as a professional python developer. response with only code. add logging for this code using debug, info, warning, error, critical when appropriate:\n\n${entireCode}`;
        // Show progress indicator while calling the GPT API
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Processing code with AI...",
            cancellable: true
        }, async (progress, token) => {
            token.onCancellationRequested(() => {
                console.log("User canceled the AI processing.");
                // Handle the cancellation if necessary
            });

            progress.report({ increment: -1 }); // Indeterminate progress

        // Fetch response from GPT-3
        try {
            const aiModifiedCode = await fetchGPT3Response(prompt);
            if (aiModifiedCode) {
                // Create a temporary file for the AI-modified code
                const tempFilePath = path.join(os.tmpdir(), `ai_modified_${path.basename(document.fileName)}`);
                fs.writeFileSync(tempFilePath, aiModifiedCode);

                // Open a diff view with the temporary file
                const tempFileUri = vscode.Uri.file(tempFilePath);
                vscode.commands.executeCommand('vscode.diff', document.uri, tempFileUri, 
				`Current vs. AI Proposed Changes - ${path.basename(document.fileName)}`)
				.then(() => {
					vscode.window.showInformationMessage(
						"Do you want to apply these changes?",
						"Apply", "Discard"
					).then(async (selection) => {
						if (selection === "Apply") {
							await applyChanges(document.uri, tempFileUri);
							vscode.window.showInformationMessage("Changes applied successfully.");
						}
						else{
							vscode.window.showInformationMessage("Changes discarded.");
						}
						
						// Close the temporary file tab
						const tempFileDocument = await vscode.workspace.openTextDocument(tempFileUri);
						const tempFileEditor = vscode.window.visibleTextEditors.find(editor => editor.document === tempFileDocument);
						if (tempFileEditor) {
							await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
						}
						// Delete the temp file in both cases
						cleanupTempFile(tempFilePath);
					});
				});
            } else {
                vscode.window.showErrorMessage("No response from AI.");
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error: ${error}`);
        }
	});
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "smart-paython-logger" is now active!');

	
	let gpt_Test = vscode.commands.registerCommand('smart-paython-logger.gpt_Test', async () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		let response = await fetchGPT3Response('what is the best way to learn python?');
		vscode.window.showInformationMessage(response || 'No response');
	});

	let addDebugLogging = vscode.commands.registerCommand('smart-paython-logger.addDebugLogging', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("No active Python file.");
            return;
        }

        const document = editor.document;
        if (document.languageId !== "python") {
            vscode.window.showErrorMessage("Active file is not a Python file.");
            return;
        }

        const selection = editor.selection;
        const selectedText = document.getText(selection).trim();

        if (!selectedText) {
            vscode.window.showErrorMessage("No variable selected.");
            return;
        }

        const text = document.getText();
        const hasLoggingImport = text.includes("import logging") || /import\s+\w+\s+as\s+logging/.test(text);
        let edit = new vscode.WorkspaceEdit();

        if (!hasLoggingImport) {
            edit.insert(document.uri, new vscode.Position(0, 0), "import logging\n");
        }

        const logStatement = `\nlogging.debug("Variable value of ${selectedText}: %s", ${selectedText})`;
        edit.insert(document.uri, document.lineAt(selection.end.line).range.end, logStatement);

        return vscode.workspace.applyEdit(edit);
	});

	let autoLogging = vscode.commands.registerCommand('smart-paython-logger.autoLogging', async () => {
		runAutoLogging();
        });

	context.subscriptions.push(gpt_Test, addDebugLogging, autoLogging, 
		vscode.window.registerWebviewViewProvider(
		'smartPythonLoggerView',
		new SmartPythonLoggerViewProvider(context.extensionUri)
	));
	
};

// This method is called when your extension is deactivated
export function deactivate() {}

class SmartPythonLoggerViewProvider implements vscode.WebviewViewProvider {
    constructor(private extensionUri: vscode.Uri) {}

    public resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, token: vscode.CancellationToken): void {
        webviewView.webview.options = {
            enableScripts: true
        };

        webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'runAutoLogging':
                    // Trigger the auto logging functionality
                    break;
                // Handle other messages
            }
        });
    }

	private getNonce() {
		let text = '';
		const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		for (let i = 0; i < 32; i++) {
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		}
		return text;
	};

    getHtmlForWebview(webview: vscode.Webview) {

		
		// Use a nonce to only allow specific scripts to run
		const nonce = this.getNonce();
	
		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!-- Use a content security policy to only allow loading images from https or from our extension directory,
				and only allow scripts that have a specific nonce. -->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Logger Configuration</title>
			</head>
			<body>
				<h1>Logger Configuration</h1>
				<form id="loggerForm">
					<label for="logFileName">Log File Name:</label><br>
					<input type="text" id="logFileName" name="logFileName"><br>
					<label for="logFilePath">Log File Path:</label><br>
					<input type="text" id="logFilePath" name="logFilePath"><br>
					<label for="logLevel">Log Level:</label><br>
					<select name="logLevel" id="logLevel">
						<option value="debug">Debug</option>
						<option value="info">Info</option>
						<option value="warning">Warning</option>
						<option value="error">Error</option>
						<option value="critical">Critical</option>
					</select><br><br>
					<input type="button" value="Run Auto Logging" id="runButton">
				</form>
	
				<script nonce="${nonce}">
					const vscode = acquireVsCodeApi();
					document.getElementById('runButton').addEventListener('click', () => {
						const logFileName = document.getElementById('logFileName').value;
						const logFilePath = document.getElementById('logFilePath').value;
						const logLevel = document.getElementById('logLevel').value;
						vscode.postMessage({
							command: 'runAutoLogging',
							logFileName,
							logFilePath,
							logLevel
						});
					});
				</script>
			</body>
			</html>`;
	};
	
	
	
}
