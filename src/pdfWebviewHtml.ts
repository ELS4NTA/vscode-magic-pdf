import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import * as vscode from 'vscode';
import {
  buildAppOptions,
  getPdfConfig,
  resolveEffectiveTheme,
  resolvePagesInverted,
  type PageColorsName,
  type ThemeName,
} from './pdfOptions';

export interface SavedView {
  page?: number;
  top?: number;
  left?: number;
  rotation?: number;
  scale?: string | number;
  sidebar?: number;
}

export interface WebviewHtmlInput {
  extensionRoot: vscode.Uri;
  webview: vscode.Webview;
  savedView: SavedView;
  themeOverride?: ThemeName;
  pageColorsOverride?: PageColorsName;
  filename: string;
}

export function renderWebviewHtml(input: WebviewHtmlInput): string {
  const { extensionRoot, webview, savedView, themeOverride, pageColorsOverride, filename } = input;
  const cspSource = webview.cspSource;
  const webRoot = vscode.Uri.joinPath(extensionRoot, 'lib', 'web');
  const nonce = crypto.randomBytes(16).toString('base64');

  const rewriteRelative = (relPath: string): string => {
    const fileUri = vscode.Uri.joinPath(webRoot, relPath);
    const uri = webview.asWebviewUri(fileUri).toString();
    if (!relPath.endsWith('/')) return uri;
    return uri.endsWith('/') ? uri : `${uri}/`;
  };

  const workerUrl = webview
    .asWebviewUri(vscode.Uri.joinPath(extensionRoot, 'lib', 'build', 'pdf.worker.mjs'))
    .toString();
  const mediaRoot = vscode.Uri.joinPath(extensionRoot, 'media');
  const polyfillsUrl = webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, 'pdfjs-polyfills.js')).toString();
  const bootstrapUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionRoot, 'dist', 'webview.js')).toString();
  const previewCssUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, 'preview.css')).toString();

  const config = getPdfConfig();
  const effectiveTheme = resolveEffectiveTheme(themeOverride, config);
  const pagesInverted = resolvePagesInverted(pageColorsOverride, effectiveTheme);
  const bootstrapConfig = {
    workerUrl,
    polyfillsUrl,
    appOptions: buildAppOptions(
      {
        cMapUrl: rewriteRelative('cmaps/'),
        standardFontDataUrl: rewriteRelative('standard_fonts/'),
        wasmUrl: rewriteRelative('wasm/'),
        iccUrl: rewriteRelative('iccs/'),
      },
      config,
      effectiveTheme,
      pageColorsOverride
    ),
    savedView,
    filename,
    themeIsDark: effectiveTheme === 'dark',
    pagesInverted,
    uiLang: vscode.env.language.split('-')[0],
  };

  let html = fs.readFileSync(vscode.Uri.joinPath(webRoot, 'viewer.html').fsPath, 'utf8');
  if (html.codePointAt(0) === 0xfeff) html = html.slice(1);

  html = html.replace(/<html\b/i, `<html lang="${bootstrapConfig.uiLang}"`);
  html = html.replace(/<meta\b[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '');
  html = html.replace(
    /(src|href)="((?!#|https?:|data:|blob:|vscode-webview:|mailto:|[a-z]+:)[^"]+)"/gi,
    (_match: string, attr: string, relPath: string) => `${attr}="${rewriteRelative(relPath)}"`
  );
  html = html.replace(/<script /gi, `<script nonce="${nonce}" `);

  const csp = `default-src 'none'; connect-src ${cspSource}; script-src 'nonce-${nonce}' 'wasm-unsafe-eval' ${cspSource}; style-src 'unsafe-inline' ${cspSource}; img-src blob: data: ${cspSource}; font-src data: ${cspSource}; worker-src ${cspSource} blob:; base-uri 'none'; form-action 'none';`;
  const configJson = JSON.stringify(bootstrapConfig).replaceAll('"', '&quot;');

  const injection = `<meta http-equiv="Content-Security-Policy" content="${csp}">
    <meta id="magic-pdf-config" data-config="${configJson}">
    <link rel="stylesheet" href="${previewCssUri}">
    <script nonce="${nonce}" src="${polyfillsUrl}"></script>
    <script nonce="${nonce}" src="${bootstrapUri}"></script>
    `;
  return html.replace(/<head>/i, `<head>${injection}`);
}
