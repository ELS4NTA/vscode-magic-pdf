# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for security vulnerabilities.

Instead, report them privately via
[GitHub Security Advisories](https://github.com/ELS4NTA/vscode-magic-pdf/security/advisories/new),
or by email to **daniel1sa_@hotmail.com**.

Please include:

- A description of the vulnerability and its impact
- Steps to reproduce
- The extension version and VS Code version

You can expect an initial response within a few days. Once a fix is released,
we're happy to credit you in the changelog (unless you prefer to stay anonymous).

## Scope notes

- Magic PDF renders PDFs locally inside a webview with a strict
  Content-Security-Policy and a per-request nonce. It does not make network
  requests to render documents.
- Embedded JavaScript in PDFs is **disabled by default** (`magicPdf.enableScripting`).
- The AI translation feature sends the selected text to GitHub Copilot's
  language models via the VS Code Language Model API. No other data leaves your
  machine.

## Supported versions

Only the latest released version receives security fixes.
