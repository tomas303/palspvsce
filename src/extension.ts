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

  // Get search folders from configuration
  const searchFolders = config.get<string[]>('searchFolders') || [];

  console.log(`Using Pascal Language Server: ${serverPath}`);
  console.log(`Search Folders: ${searchFolders.join(', ')}`);
  
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
      fileEvents: vscode.workspace.createFileSystemWatcher('**/*.{pas,pp,inc,dpr}'),
      // Make sure the server is notified about configuration changes
      configurationSection: 'pascalLanguageServer'
    },
    // Pass initialization options with SearchFolders to match your Go implementation
    initializationOptions: {
      SearchFolders: searchFolders
    },
    // The client automatically sends workspace folders during initialization
    // We don't need to set workspaceFolder here as it's handled automatically
  };

  // Create the language client and start the client
  client = new LanguageClient(
    'pascalLanguageServer',
    'Pascal Language Server',
    serverOptions,
    clientOptions
  );

  // Register workspace folder change event handler
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(e => {
      // If the client is already running, notify it about workspace folder changes
      if (client) {
        client.info('Workspace folders changed');
        // Your server will automatically receive workspace folder change notifications 
        // if it declares workspace folder capability in its initialization result
      }
    })
  );

  // Register configuration change event handler
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('pascalLanguageServer.searchFolders')) {
        // Get updated search folders
        const config = vscode.workspace.getConfiguration('pascalLanguageServer');
        const searchFolders = config.get<string[]>('searchFolders') || [];
        console.log(`Search Folders changed: ${searchFolders.join(', ')}`);
        
        // The workspace/didChangeConfiguration notification is already automatically 
        // sent to the server because of the synchronize.configurationSection setting
      }
    })
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
