export enum ColorThemeKind {
  Light = 1,
  Dark = 2,
  HighContrast = 3,
  HighContrastLight = 4,
}

export const window = {
  activeColorTheme: { kind: ColorThemeKind.Light },
};

export const env = {
  language: 'en',
};

export const workspace = {
  getConfiguration: () => ({
    get: () => undefined,
  }),
};
