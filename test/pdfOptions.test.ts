import { describe, it, expect } from 'vitest';
import type * as vscode from 'vscode';
import { resolveTheme, resolveEffectiveTheme, resolvePagesInverted } from '../src/pdfOptions';
import { ColorThemeKind } from './__mocks__/vscode';

function cfg(value?: string): vscode.WorkspaceConfiguration {
  return {
    get: (key: string) => (key === 'theme' ? value : undefined),
  } as unknown as vscode.WorkspaceConfiguration;
}

describe('resolveTheme', () => {
  it('lets an explicit override win over config', () => {
    expect(resolveTheme('dark', cfg('light'))).toBe('dark');
  });

  it('falls back to the configured theme when there is no override', () => {
    expect(resolveTheme(undefined, cfg('light'))).toBe('light');
  });

  it("defaults to 'auto' when neither override nor config is set", () => {
    expect(resolveTheme(undefined, cfg())).toBe('auto');
  });
});

describe('resolveEffectiveTheme', () => {
  it('returns the override directly when it is concrete', () => {
    expect(resolveEffectiveTheme('light', cfg(), ColorThemeKind.Dark)).toBe('light');
  });

  it('collapses auto to dark under a dark host theme', () => {
    expect(resolveEffectiveTheme('auto', cfg(), ColorThemeKind.Dark)).toBe('dark');
  });

  it('treats high contrast as dark', () => {
    expect(resolveEffectiveTheme('auto', cfg(), ColorThemeKind.HighContrast)).toBe('dark');
  });

  it('collapses auto to light under a light host theme', () => {
    expect(resolveEffectiveTheme('auto', cfg(), ColorThemeKind.Light)).toBe('light');
  });

  it('treats high-contrast-light as light', () => {
    expect(resolveEffectiveTheme('auto', cfg(), ColorThemeKind.HighContrastLight)).toBe('light');
  });
});

describe('resolvePagesInverted', () => {
  it('inverts when the page-colors override is "inverted"', () => {
    expect(resolvePagesInverted('inverted', 'light')).toBe(true);
  });

  it('does not invert when the override is "normal", even on a dark theme', () => {
    expect(resolvePagesInverted('normal', 'dark')).toBe(false);
  });

  it('follows a dark theme when there is no override', () => {
    expect(resolvePagesInverted(undefined, 'dark')).toBe(true);
  });

  it('does not invert on a light theme without an override', () => {
    expect(resolvePagesInverted(undefined, 'light')).toBe(false);
  });

  it('does not invert on auto without an override', () => {
    expect(resolvePagesInverted(undefined, 'auto')).toBe(false);
  });
});
