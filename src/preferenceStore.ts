import type * as vscode from 'vscode';
import type { PageColorsName, ThemeName } from './pdfOptions';

const THEME_OVERRIDE_KEY = 'magicPdf:theme-override';
const PAGE_COLORS_OVERRIDE_KEY = 'magicPdf:page-colors-override';

export class PreferenceStore {
  public constructor(private readonly state: vscode.Memento) {}

  public themeOverride(): ThemeName | undefined {
    return this.state.get<ThemeName>(THEME_OVERRIDE_KEY);
  }

  public pageColorsOverride(): PageColorsName | undefined {
    return this.state.get<PageColorsName>(PAGE_COLORS_OVERRIDE_KEY);
  }

  public setThemeOverride(value: ThemeName): Thenable<void> {
    return this.state.update(THEME_OVERRIDE_KEY, value);
  }

  public setPageColorsOverride(value: PageColorsName): Thenable<void> {
    return this.state.update(PAGE_COLORS_OVERRIDE_KEY, value);
  }
}
