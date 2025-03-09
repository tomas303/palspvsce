import * as path from 'path';
import * as vscode from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: vscode.ExtensionContext) {
  // The server is implemented in a separate project and compiled to JavaScript
  // Get the path to the server module
  const serverModule = context.asAbsolutePath(
    path.join('server', 'out', 'server.js')
  );

  // Server options - using Node.js module
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: { execArgv: ['--nolazy', '--inspect=6009'] }
    }
  };

  // For executable instead of node module use this:
  const config = vscode.workspace.getConfiguration('pascalLanguageServer');
  const customServerPath = config.get<string>('serverPath');
  
  if (customServerPath && customServerPath.trim() !== '') {
    console.log(`Using custom Pascal Language Server: ${customServerPath}`);
    const serverOptions: ServerOptions = {
      run: { command: customServerPath },
      debug: { command: customServerPath, args: ['--debug'] }
    };
  }

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
