// Back-compat barrel. The wire protocol now lives in ./protocol (dependency-
// free so the webview can share it); host modules keep importing from './types'.
export * from './protocol';
