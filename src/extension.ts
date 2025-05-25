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

// Helper function to register custom commands
function registerCustomCommands(context: vscode.ExtensionContext) {
  const dumpScopesCommand = vscode.commands.registerCommand('pascalLanguageServer.dumpScopes', async (uri?: vscode.Uri) => {
    if (!client) {
      vscode.window.showErrorMessage('Pascal Language Server is not running');
      return;
    }

    // Get the active editor or use the provided URI
    const activeEditor = vscode.window.activeTextEditor;
    const targetUri = uri || activeEditor?.document.uri;
    
    if (!targetUri) {
      vscode.window.showErrorMessage('No Pascal file is currently open');
      return;
    }

    // Check if the file is a Pascal file
    const document = await vscode.workspace.openTextDocument(targetUri);
    if (document.languageId !== 'pascal' && document.languageId !== 'objectpascal') {
      vscode.window.showErrorMessage('The selected file is not a Pascal file');
      return;
    }

    try {
      // Send custom request to the language server
      const result = await client.sendRequest('pascal/dumpScopes', {
        textDocument: {
          uri: targetUri.toString()
        }
      });

      // Handle response as an object with nested dump property
      if (result && typeof result === 'object' && result.dump && typeof result.dump === 'string') {
        const newDocument = await vscode.workspace.openTextDocument({
          content: result.dump,
          language: 'plaintext'
        });
        
        // Show the document in a new editor
        await vscode.window.showTextDocument(newDocument);
      } else {
        vscode.window.showInformationMessage('No scope information available for this file');
      }
    } catch (error) {
      console.error('Error executing DumpScopes command:', error);
      vscode.window.showErrorMessage(`Failed to dump scopes: ${error}`);
    }
  });

  // Add command to subscriptions
  context.subscriptions.push(dumpScopesCommand);
}

// Helper function to get configuration values
function getConfiguration() {
  const config = vscode.workspace.getConfiguration('pascalLanguageServer');
  
  return {
    serverPath: config.get<string>('serverPath'),
    searchFolders: config.get<string[]>('searchFolders') || [],
    unitScopeNames: config.get<string[]>('unitScopeNames') || [],
    prefetchUnits: (() => {
      const prefetchUnitsValue = config.get('prefetchUnits');
      return typeof prefetchUnitsValue === 'string' ? 
        prefetchUnitsValue.toLowerCase() === 'true' : 
        Boolean(prefetchUnitsValue);
    })(),
    connectionType: config.get<string>('connectionType') || 'stdio',
    tcpPort: config.get<number>('tcpPort') || 8080,
    tcpHost: config.get<string>('tcpHost') || 'localhost',
    logMainFile: config.get<string>('logMainFile') || '',
    logMainLevel: config.get<string>('logMainLevel') || '',
    logAntlrErrorFile: config.get<string>('logAntlrErrorFile') || '',
    logAntlrErrorLevel: config.get<string>('logAntlrErrorLevel') || '',
    logAntlrTraceFile: config.get<string>('logAntlrTraceFile') || '',
    logAntlrTraceLevel: config.get<string>('logAntlrTraceLevel') || '',
    logStructureFile: config.get<string>('logStructureFile') || '',
    logStructureLevel: config.get<string>('logStructureLevel') || ''
  };
}

// Helper function to build command line arguments
function buildCommandLineArgs(config: ReturnType<typeof getConfiguration>): string[] {
  const commandLineArgs: string[] = [];
  
  if (config.logMainLevel && config.logMainLevel !== 'none') {
    commandLineArgs.push(`-log-level-main=${config.logMainLevel}`);
  }
  if (config.logMainFile) {
    commandLineArgs.push(`-log-file-main=${config.logMainFile}`);
  }
  if (config.logAntlrErrorLevel && config.logAntlrErrorLevel !== 'none') {
    commandLineArgs.push(`-log-level-antlr-error=${config.logAntlrErrorLevel}`);
  }
  if (config.logAntlrErrorFile) {
    commandLineArgs.push(`-log-file-antlr-error=${config.logAntlrErrorFile}`);
  }
  if (config.logAntlrTraceLevel && config.logAntlrTraceLevel !== 'none') {
    commandLineArgs.push(`-log-level-antlr-trace=${config.logAntlrTraceLevel}`);
  }
  if (config.logAntlrTraceFile) {
    commandLineArgs.push(`-log-file-antlr-trace=${config.logAntlrTraceFile}`);
  }
  if (config.logStructureLevel && config.logStructureLevel !== 'none') {
    commandLineArgs.push(`-log-level-structure=${config.logStructureLevel}`);
  }
  if (config.logStructureFile) {
    commandLineArgs.push(`-log-file-structure=${config.logStructureFile}`);
  }
  
  return commandLineArgs;
}

// Helper function to create server options
function createServerOptions(config: ReturnType<typeof getConfiguration>, commandLineArgs: string[]): ServerOptions {
  if (config.connectionType === 'tcp') {
    console.log(`Connecting via TCP: ${config.tcpHost}:${config.tcpPort}`);
    // For TCP server connection
    return () => {
      // Connect to language server via socket
      const socket = net.connect({ port: config.tcpPort, host: config.tcpHost });
      
      socket.on('error', (e) => {
        console.error(`Socket error: ${e}`);
        // Consider if the server is already running
        console.log('Assuming server is already running, not spawning a new process');
      });
      
      const result: StreamInfo = {
        writer: socket,
        reader: socket
      };
      
      return Promise.resolve(result);
    };
  } else {
    // For standard I/O
    console.log('Connecting via stdio');
    console.log(`Command line args: ${commandLineArgs.join(' ')}`);
    
    // Single server options configuration with command line arguments
    return {
      run: { 
        command: config.serverPath!,
        args: commandLineArgs
      },
      debug: { 
        command: config.serverPath!, 
        args: commandLineArgs
      }
    };
  }
}

// Helper function to create client options
function createClientOptions(config: ReturnType<typeof getConfiguration>) {
  return {
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
      SearchFolders: config.searchFolders,
      unitScopeNames: config.unitScopeNames,
      prefetchUnits: config.prefetchUnits,
    }
  };
}

// Helper function to register event handlers
function registerEventHandlers(context: vscode.ExtensionContext) {
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
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Pascal LSP Extension activating...');
  
  // Get configuration
  const config = getConfiguration();
  
  if (!config.serverPath || config.serverPath.trim() === '') {
    vscode.window.showErrorMessage('Pascal Language Server path not configured. Please set "pascalLanguageServer.serverPath" in settings.');
    return;
  }

  // Log configuration
  console.log(`Using Pascal Language Server: ${config.serverPath}`);
  console.log(`Connection type: ${config.connectionType}`);
  console.log(`Search Folders: ${config.searchFolders.join(', ')}`);
  console.log(`Unit scope names: ${config.unitScopeNames.join(', ')}`);
  console.log(`Prefetch units: ${config.prefetchUnits}`);
  console.log(`Main log level: ${config.logMainLevel}`);
  console.log(`Main log file: ${config.logMainFile}`);
  console.log(`AntlrError log level: ${config.logAntlrErrorLevel}`);
  console.log(`AntlrError log file: ${config.logAntlrErrorFile}`);
  console.log(`AntlrTrace log level: ${config.logAntlrTraceLevel}`);
  console.log(`AntlrTrace log file: ${config.logAntlrTraceFile}`);
  console.log(`Structure log level: ${config.logStructureLevel}`);
  console.log(`Structure log file: ${config.logStructureFile}`);
  
  // Build command line arguments
  const commandLineArgs = buildCommandLineArgs(config);
  
  // Create server and client options
  const serverOptions = createServerOptions(config, commandLineArgs);
  const clientOptions = createClientOptions(config);

  // Create the language client
  client = new LanguageClient(
    'pascalLanguageServer',
    'Pascal Language Server',
    serverOptions,
    clientOptions
  );

  // Register custom commands
  registerCustomCommands(context);
  
  // Register event handlers
  registerEventHandlers(context);

  // Start the client. This will also launch the server
  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
