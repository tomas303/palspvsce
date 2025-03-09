# Pascal Language Server Protocol Extension

This extension provides language server protocol client support for Pascal and Object Pascal files in Visual Studio Code. It connects to an external Pascal language server implementation.

## Features

* Syntax highlighting for Pascal files
* Connection to a Pascal Language Server providing:
  * Diagnostics (errors, warnings)
  * Code completion
  * Hover information
  * Go to definition
  * Find references
  * Symbol search

## Requirements

* Visual Studio Code 1.74.0 or newer
* An external Pascal Language Server implementation (developed separately in Go)

## Extension Settings

This extension contributes the following settings:

* `pascalLanguageServer.serverPath`: Path to the Pascal Language Server executable (required).
* `pascalLanguageServer.connectionType`: Connection type to use ("stdio" or "tcp").
* `pascalLanguageServer.tcpPort`: TCP port for the language server when using TCP connection (default: 8080).
* `pascalLanguageServer.tcpHost`: TCP host for the language server (default: localhost).
* `pascalLanguageServer.trace.server`: Controls the verbosity of communication traces between VSCode and the language server.
* `pascalLanguageServer.searchFolders`: Array of folders to search during code analysis and resolution.

## Setup

1. Install this extension
2. Set the `pascalLanguageServer.serverPath` setting to point to your Go-based Pascal language server executable
3. Configure `pascalLanguageServer.searchFolders` with the paths your language server should search
4. Choose your connection type (stdio or tcp)
5. If using TCP, configure the port (your server should accept a --port parameter)
6. Open a Pascal file to activate the extension

## Debugging

For easier debugging of your Go-based language server:

1. Set `pascalLanguageServer.connectionType` to "tcp"
2. Configure the port with `pascalLanguageServer.tcpPort`
3. Run your Go server manually in debug mode with `--port=8080` (replace 8080 with your configured port)
4. The extension will connect to your server over TCP instead of spawning a new process

## Known Issues

This is an early release that may contain bugs or incomplete features.

## Release Notes

### 0.0.1

Initial release of Pascal LSP Extension
