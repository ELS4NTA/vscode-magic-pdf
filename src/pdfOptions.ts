import * as vscode from 'vscode';

const CURSOR_TOOL = { select: 0, hand: 1 } as const;
const SCROLL_MODE = { vertical: 0, horizontal: 1, wrapped: 2, page: 3 } as const;
const SPREAD_MODE = { none: 0, odd: 1, even: 2 } as const;
const TEXT_LAYER = { disable: 0, enable: 1, enablePermissions: 2 } as const;
const ANNOTATION_MODE = { disable: 0, enable: 1, enableForms: 2, enableStorage: 3 } as const;
const ANNOTATION_EDITOR = {
  disable: -1,
  none: 0,
  freeText: 3,
  highlight: 9,
  stamp: 13,
  ink: 15,
  signature: 101,
  comment: 102,
} as const;
const LINK_TARGET = { none: 0, self: 1, blank: 2, parent: 3, top: 4 } as const;
const SIDEBAR_VIEW = { none: 0, pages: 1, outline: 2, attachments: 3, layers: 4 } as const;
const TOOLBAR_DENSITY = { normal: 0, compact: 1, touch: 2 } as const;
const DEFAULT_MAX_CANVAS_PIXELS = 33_554_432; // 32 MiB, pdfjs default
const THEME_OPTIONS = {
  auto: { viewerCssTheme: 0 },
  light: { viewerCssTheme: 1 },
  dark: {
    viewerCssTheme: 2,
    forcePageColors: true,
    pageColorsBackground: '#1e1e1e',
    pageColorsForeground: '#cccccc',
  },
} as const;

export type PdfAppOptions = Record<string, unknown>;

export interface PdfAssetUrls {
  cMapUrl: string;
  standardFontDataUrl: string;
  wasmUrl: string;
  iccUrl: string;
}

function pickEnum<M extends Record<string, number>>(
  config: vscode.WorkspaceConfiguration,
  key: string,
  map: M,
  fallback: keyof M
): M[keyof M] {
  const value = config.get<keyof M>(key) ?? fallback;
  return map[value];
}

export type ThemeName = keyof typeof THEME_OPTIONS;
export type PageColorsName = 'normal' | 'inverted';

/**
 * Single accessor for our settings section. Centralizing the key here means
 * callers don't repeat the magic string and don't need to import vscode just
 * to read configuration.
 *
 * @returns vscode.WorkspaceConfiguration for the 'magicPdf' section,
 * typed as any to avoid leaking vscode types into modules that shouldn't depend on vscode.
 */
export function getPdfConfig(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration('magicPdf');
}

const INVERTED_PAGE_COLORS = {
  forcePageColors: true,
  pageColorsBackground: '#1e1e1e',
  pageColorsForeground: '#cccccc',
} as const;

export function resolveTheme(
  override: ThemeName | undefined,
  config: vscode.WorkspaceConfiguration = getPdfConfig()
): ThemeName {
  return override ?? config.get<ThemeName>('theme') ?? 'auto';
}

/**
 * Collapse `auto` down to a concrete light/dark using VS Code's active theme.
 * HighContrast counts as dark; HighContrastLight as light.
 *
 * @param override Explicit theme override (e.g. from the toolbar toggle).
 * @param config Configuration object to read the 'theme' setting from if override is not set.
 * @param hostThemeKind VS Code's activeColorTheme.kind, used when the result of override+config is 'auto'
 * @returns The effective theme to use, with 'auto' resolved to 'light' or 'dark'.
 */
export function resolveEffectiveTheme(
  override: ThemeName | undefined,
  config: vscode.WorkspaceConfiguration,
  hostThemeKind: vscode.ColorThemeKind = vscode.window.activeColorTheme.kind
): Exclude<ThemeName, 'auto'> {
  const resolved = resolveTheme(override, config);
  if (resolved !== 'auto') return resolved;
  return hostThemeKind === vscode.ColorThemeKind.Dark || hostThemeKind === vscode.ColorThemeKind.HighContrast
    ? 'dark'
    : 'light';
}

/**
 * Whether the page canvas should be color-inverted. An explicit override wins
 * over the chrome theme; otherwise the dark chrome theme also darkens pages
 * (existing behavior).
 *
 * @param pageColorsOverride Explicit page colors override (e.g. from the toolbar toggle).
 * @param theme The effective theme, used when pageColorsOverride is not set to determine if pages should be inverted by default.
 * @returns True if page colors should be inverted, false if not.
 */
export function resolvePagesInverted(pageColorsOverride: PageColorsName | undefined, theme: ThemeName): boolean {
  if (pageColorsOverride === 'inverted') return true;
  if (pageColorsOverride === 'normal') return false;
  return theme === 'dark';
}

export function buildAppOptions(
  urls: PdfAssetUrls,
  config: vscode.WorkspaceConfiguration = getPdfConfig(),
  themeOverride?: ThemeName,
  pageColorsOverride?: PageColorsName
): PdfAppOptions {
  const theme = resolveTheme(themeOverride, config);
  const themeOpts: Record<string, unknown> = { ...THEME_OPTIONS[theme] };
  if (pageColorsOverride) {
    delete themeOpts.forcePageColors;
    delete themeOpts.pageColorsBackground;
    delete themeOpts.pageColorsForeground;
  }
  const pageColorOpts: Record<string, unknown> = pageColorsOverride === 'inverted' ? { ...INVERTED_PAGE_COLORS } : {};

  const debugOpts: Record<string, unknown> = config.get<boolean>('debug') ? { verbosity: 5, pdfBug: true } : {};

  return {
    defaultUrl: '',
    localeProperties: { lang: vscode.env.language },
    cMapUrl: urls.cMapUrl,
    cMapPacked: true,
    standardFontDataUrl: urls.standardFontDataUrl,
    wasmUrl: urls.wasmUrl,
    iccUrl: urls.iccUrl,
    disablePreferences: true,
    enableSignatureEditor: true,
    enableComment: true,
    enableHighlightFloatingButton: true,
    enableMerge: true,
    enableSplitMerge: true,
    enableDetailCanvas: false,
    cursorToolOnLoad: pickEnum(config, 'default.cursor', CURSOR_TOOL, 'select'),
    defaultZoomValue: config.get<string>('default.scale') ?? 'auto',
    sidebarViewOnLoad: pickEnum(config, 'default.sidebar', SIDEBAR_VIEW, 'none'),
    scrollModeOnLoad: pickEnum(config, 'default.scrollMode', SCROLL_MODE, 'vertical'),
    spreadModeOnLoad: pickEnum(config, 'default.spreadMode', SPREAD_MODE, 'none'),
    textLayerMode: pickEnum(config, 'default.textLayer', TEXT_LAYER, 'enable'),
    annotationMode: pickEnum(config, 'default.annotations', ANNOTATION_MODE, 'enableForms'),
    annotationEditorMode: pickEnum(config, 'default.annotationEditor', ANNOTATION_EDITOR, 'none'),
    externalLinkTarget: pickEnum(config, 'default.externalLinkTarget', LINK_TARGET, 'blank'),
    enableScripting: config.get<boolean>('enableScripting') ?? false,
    enablePermissions: config.get<boolean>('enablePermissions') ?? true,
    enableHWA: config.get<boolean>('enableHWA') ?? true,
    maxCanvasPixels: config.get<number>('maxCanvasPixels') ?? DEFAULT_MAX_CANVAS_PIXELS,
    toolbarDensity: pickEnum(config, 'toolbarDensity', TOOLBAR_DENSITY, 'normal'),
    ...themeOpts,
    ...pageColorOpts,
    ...debugOpts,
  };
}
