import * as vscode from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: vscode.ExtensionContext) {
  // Get server path from configuration
  const config = vscode.workspace.getConfiguration('pascalLanguageServer');
  const serverPath = config.get<string>('serverPath');
  
  if (!serverPath || serverPath.trim() === '') {
    vscode.window.showErrorMessage('Pascal Language Server path not configured. Please set "pascalLanguageServer.serverPath" in settings.');
    return;
  }

  console.log(`Using Pascal Language Server: ${serverPath}`);
  
  // Server options - using external executable
  const serverOptions: ServerOptions = {
    run: { command: serverPath },
    debug: { command: serverPath, args: ['--debug'] }
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for Pascal documents
    documentSelector: [
      { scheme: 'file', language: 'pascal' },
      { scheme: 'file', language: 'objectpascal' }
    ],
    synchronize: {
      // Notify the server about file changes in the workspace
      fileEvents: vscode.workspace.createFileSystemWatcher('**/*.{pas,pp,inc,dpr}')
    }
  };

  // Create the language client and start the client
  client = new LanguageClient(
    'pascalLanguageServer',
    'Pascal Language Server',
    serverOptions,
    clientOptions
  );

  // Start the client. This will also launch the server
  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
