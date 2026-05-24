import * as vscode from 'vscode';

type Emit = (msg: { type: 'translateChunk' | 'translateEnd'; chunk?: string; error?: string }) => void;

export class TranslationService implements vscode.Disposable {
  private tokenSource?: vscode.CancellationTokenSource;

  public constructor(private readonly logger: vscode.LogOutputChannel) {}

  /**
   * Translate text via vscode.lm (Copilot vendor). Prioritizing cheap/fast models.
   * Emits 'translateChunk' per streamed token and 'translateEnd' (with optional error) when done.
   * @param text The text to translate.
   * @param source The source language.
   * @param target The target language.
   * @param emit The emit function.
   * @returns A promise resolving when the translation is complete.
   */
  public async translate(text: string, source: string, target: string, emit: Emit): Promise<void> {
    this.tokenSource?.cancel();
    this.tokenSource?.dispose();
    const tokenSource = new vscode.CancellationTokenSource();
    this.tokenSource = tokenSource;

    try {
      const models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
      if (models.length === 0) {
        emit({
          type: 'translateEnd',
          error: vscode.l10n.t('No Copilot language models available. Install and sign in to GitHub Copilot.'),
        });
        return;
      }

      const cheapFirst = ['haiku', 'mini', 'flash', 'nano'];
      const pick = models.find((m) => cheapFirst.some((tier) => m.family.toLowerCase().includes(tier))) ?? models[0];

      const sourceHint = source === 'auto' ? '' : ` from ${source}`;
      const messages = [
        vscode.LanguageModelChatMessage.User(
          `Translate the following text${sourceHint} to ${target}. Output ONLY the translated text, with no preamble, quotes, or formatting:\n\n${text}`
        ),
      ];
      const response = await pick.sendRequest(messages, {}, tokenSource.token);

      for await (const chunk of response.text) {
        if (tokenSource.token.isCancellationRequested) return;
        emit({ type: 'translateChunk', chunk });
      }
      emit({ type: 'translateEnd' });
    } catch (err) {
      if (tokenSource.token.isCancellationRequested) return;
      this.logger.error('Translate failed', err);
      emit({ type: 'translateEnd', error: String(err) });
    }
  }

  public dispose(): void {
    this.tokenSource?.cancel();
    this.tokenSource?.dispose();
  }
}
