import * as vscode from 'vscode';
import type { InboundMessage } from './types';
import type { HandlerContext } from './context';

type TranslateMsg = Extract<InboundMessage, { type: 'translate' }>;

export function handleTranslate(msg: TranslateMsg, ctx: HandlerContext): void {
  if (typeof msg.text !== 'string' || msg.text.length === 0) return;
  const requestId = msg.requestId ?? 0;
  void ctx.translator.translate(
    msg.text,
    msg.source ?? 'auto',
    msg.target ?? vscode.env.language.split('-')[0],
    (out) => {
      void ctx.webview.postMessage({ ...out, requestId });
    }
  );
}
