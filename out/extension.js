"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const net = __importStar(require("net"));
// Fix import to use require() to avoid module resolution issues
const languageClient = require('vscode-languageclient/node');
// Extract client from the module
const { LanguageClient } = languageClient;
let client;
function activate(context) {
    console.log('Pascal LSP Extension activating...');
    // Get server path from configuration
    const config = vscode.workspace.getConfiguration('pascalLanguageServer');
    const serverPath = config.get('serverPath');
    if (!serverPath || serverPath.trim() === '') {
        vscode.window.showErrorMessage('Pascal Language Server path not configured. Please set "pascalLanguageServer.serverPath" in settings.');
        return;
    }
    // Get search folders from configuration
    const searchFolders = config.get('searchFolders') || [];
    // Get connection type and TCP settings
    const connectionType = config.get('connectionType') || 'stdio';
    const tcpPort = config.get('tcpPort') || 8080;
    const tcpHost = config.get('tcpHost') || 'localhost';
    console.log(`Using Pascal Language Server: ${serverPath}`);
    console.log(`Connection type: ${connectionType}`);
    console.log(`Search Folders: ${searchFolders.join(', ')}`);
    // Define server options based on connection type
    let serverOptions;
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
            const result = {
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
    }
    else {
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
    client = new LanguageClient('pascalLanguageServer', 'Pascal Language Server', serverOptions, clientOptions);
    // Register workspace folder change event handler
    context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(e => {
        // If the client is already running, notify it about workspace folder changes
        if (client) {
            client.info('Workspace folders changed');
        }
    }));
    // Register configuration change event handler
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('pascalLanguageServer.searchFolders')) {
            // Get updated search folders
            const config = vscode.workspace.getConfiguration('pascalLanguageServer');
            const searchFolders = config.get('searchFolders') || [];
            console.log(`Search Folders changed: ${searchFolders.join(', ')}`);
        }
    }));
    // Start the client. This will also launch the server
    client.start();
}
exports.activate = activate;
function deactivate() {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map