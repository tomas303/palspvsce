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
  const unitScopeNames = config.get<string[]>('unitScopeNames') || [];
  // Ensure boolean value regardless of how it's stored in JSON
  const prefetchUnitsValue = config.get('prefetchUnits');
  const prefetchUnits = typeof prefetchUnitsValue === 'string' ? 
    prefetchUnitsValue.toLowerCase() === 'true' : 
    Boolean(prefetchUnitsValue);
  
  // Get connection type and TCP settings
  const connectionType = config.get<string>('connectionType') || 'stdio';
  const tcpPort = config.get<number>('tcpPort') || 8080;
  const tcpHost = config.get<string>('tcpHost') || 'localhost';
  
  // Get logging configuration
  const logMainFile = config.get<string>('logMainFile') || '';
  const logMainLevel = config.get<string>('logMainLevel') || '';
  const logAntlrErrorFile = config.get<string>('logAntlrErrorFile') || '';
  const logAntlrErrorLevel = config.get<string>('logAntlrErrorLevel') || '';
  const logAntlrTraceFile = config.get<string>('logAntlrTraceFile') || '';
  const logAntlrTraceLevel = config.get<string>('logAntlrTraceLevel') || '';
  const logStructureFile = config.get<string>('logStructureFile') || '';
  const logStructureLevel = config.get<string>('logStructureLevel') || '';

  console.log(`Using Pascal Language Server: ${serverPath}`);
  console.log(`Connection type: ${connectionType}`);
  console.log(`Search Folders: ${searchFolders.join(', ')}`);
  console.log(`Unit scope names: ${unitScopeNames.join(', ')}`);
  console.log(`Prefetch units: ${prefetchUnits}`);
  console.log(`Main log level: ${logMainLevel}`);
  console.log(`Main log file: ${logMainFile}`);
  console.log(`AntlrError log level: ${logAntlrErrorLevel}`);
  console.log(`AntlrError log file: ${logAntlrErrorFile}`);
  console.log(`AntlrTrace log level: ${logAntlrTraceLevel}`);
  console.log(`AntlrTrace log file: ${logAntlrTraceFile}`);
  console.log(`Structure log level: ${logStructureLevel}`);
  console.log(`Structure log file: ${logStructureFile}`);
  
  // Prepare command line arguments
  const commandLineArgs: string[] = [];
  
  if (logMainLevel && logMainLevel !== 'none') {
    commandLineArgs.push(`-log-level-main=${logMainLevel}`);
  }
  if (logMainFile) {
    commandLineArgs.push(`-log-file-main=${logMainFile}`);
  }
  if (logAntlrErrorLevel && logAntlrErrorLevel !== 'none') {
    commandLineArgs.push(`-log-level-antlr-error=${logAntlrErrorLevel}`);
  }
  if (logAntlrErrorFile) {
    commandLineArgs.push(`-log-file-antlr-error=${logAntlrErrorFile}`);
  }
  if (logAntlrTraceLevel && logAntlrTraceLevel !== 'none') {
    commandLineArgs.push(`-log-level-antlr-trace=${logAntlrTraceLevel}`);
  }
  if (logAntlrTraceFile) {
    commandLineArgs.push(`-log-file-antlr-trace=${logAntlrTraceFile}`);
  }
  if (logStructureLevel && logStructureLevel !== 'none') {
    commandLineArgs.push(`-log-level-structure=${logStructureLevel}`);
  }
  if (logStructureFile) {
    commandLineArgs.push(`-log-file-structure=${logStructureFile}`);
  }
  
  


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
        // Pass the port to your server - port flag might also use dashes, adjust if needed
        const tcpArgs = [...commandLineArgs, `-port=${tcpPort}`];
        const serverProcess = cp.spawn(serverPath, tcpArgs, { 
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
    console.log(`Command line args: ${commandLineArgs.join(' ')}`);
    
    // Single server options configuration with command line arguments
    serverOptions = {
      run: { 
        command: serverPath,
        args: commandLineArgs
      },
      debug: { 
        command: serverPath, 
        args: commandLineArgs
      }
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
    // Pass initialization options
    initializationOptions: {
      SearchFolders: searchFolders,
      unitScopeNames: unitScopeNames,
      prefetchUnits: prefetchUnits,
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
