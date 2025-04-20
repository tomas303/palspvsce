import * as vscode from 'vscode';
import * as net from 'net';
// Fix import to use require() to avoid module resolution issues
const languageClient = require('vscode-languageclient/node');

// Define types explicitly to avoid type errors
type StreamInfo = {
  writer: NodeJS.WritableStream;
  reader: NodeJS.ReadableStream;
};

// Extract client from the module
const { LanguageClient } = languageClient;

// ServerOptions can be a function or an object
type ServerOptions = 
  | { run: any; debug: any }
  | (() => Promise<StreamInfo>);

let client: any;

export function activate(context: vscode.ExtensionContext) {
  console.log('Pascal LSP Extension activating...');
  
  // Get server path from configuration
  const config = vscode.workspace.getConfiguration('pascalLanguageServer');
  const serverPath = config.get<string>('serverPath');
  
  if (!serverPath || serverPath.trim() === '') {
    vscode.window.showErrorMessage('Pascal Language Server path not configured. Please set "pascalLanguageServer.serverPath" in settings.');
    return;
  }

  // Get search folders from configuration
  const searchFolders = config.get<string[]>('searchFolders') || [];
  
  // Get connection type and TCP settings
  const connectionType = config.get<string>('connectionType') || 'stdio';
  const tcpPort = config.get<number>('tcpPort') || 8080;
  const tcpHost = config.get<string>('tcpHost') || 'localhost';

  console.log(`Using Pascal Language Server: ${serverPath}`);
  console.log(`Connection type: ${connectionType}`);
  console.log(`Search Folders: ${searchFolders.join(', ')}`);
  
  // Define server options based on connection type
  let serverOptions: ServerOptions;
  
  if (connectionType === 'tcp') {
    console.log(`Connecting via TCP: ${tcpHost}:${tcpPort}`);
    // For TCP server connection
    serverOptions = () => {
      // Connect to language server via socket
      const socket = net.connect({ port: tcpPort, host: tcpHost });
      
      socket.on('error', (e) => {
        console.error(`Socket error: ${e}`);
        // Consider if the server is already running
        console.log('Assuming server is already running, not spawning a new process');
      });
      
      const result: StreamInfo = {
        writer: socket,
        reader: socket
      };
      
      // Only start the server if we're managing it (comment this out if you're launching manually)
      /*
      const cp = require('child_process');
      try {
        // Pass the port to your server
        const serverProcess = cp.spawn(serverPath, [`--port=${tcpPort}`], { 
          detached: true,
          stdio: 'ignore'
        });
        console.log(`Server process started with PID: ${serverProcess.pid}`);
        serverProcess.unref(); // Don't wait for the child process
      } catch (error) {
        console.error(`Failed to start server process: ${error}`);
      }
      */
      
      return Promise.resolve(result);
    };
  } else {
    // For standard I/O
    console.log('Connecting via stdio');
    serverOptions = {
      run: { command: serverPath },
      debug: { command: serverPath, args: ['--debug'] }
    };
  }

  // Options to control the language client
  const clientOptions = {
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
    }
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
