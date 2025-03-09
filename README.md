# Pascal Language Server Protocol Extension

This extension provides language server protocol support for Pascal and Object Pascal files in Visual Studio Code.

## Features

* Syntax highlighting for Pascal files
* Language server features:
  * Diagnostics (errors, warnings)
  * Code completion
  * Hover information
  * Go to definition
  * Find references
  * Symbol search

## Requirements

* Visual Studio Code 1.74.0 or newer

## Extension Settings

This extension contributes the following settings:

* `pascalLanguageServer.maxNumberOfProblems`: Controls the maximum number of problems reported by the server.
* `pascalLanguageServer.serverPath`: Path to a custom Pascal Language Server executable (leave empty to use the built-in server).

## Known Issues

This is an early release that may contain bugs or incomplete features.

## Release Notes

### 0.0.1

Initial release of Pascal LSP Extension
