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
* `pascalLanguageServer.trace.server`: Controls the verbosity of communication traces between VSCode and the language server.
* `pascalLanguageServer.searchFolders`: Array of folders to search during code analysis and resolution.

## Setup

1. Install this extension
2. Set the `pascalLanguageServer.serverPath` setting to point to your Go-based Pascal language server executable
3. Configure `pascalLanguageServer.searchFolders` with the paths your language server should search
4. Open a Pascal file to activate the extension

## Known Issues

This is an early release that may contain bugs or incomplete features.

## Release Notes

### 0.0.1

Initial release of Pascal LSP Extension
