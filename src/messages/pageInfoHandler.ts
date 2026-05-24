import type { InboundMessage, PageInfo } from './types';
import type { HandlerContext } from './context';

type PageInfoMsg = Extract<InboundMessage, { type: 'pageInfo' }>;

/**
 * Build a partial patch with only the fields the message carries. The host
 * merges and dedupes.
 *
 * @param msg The message, which may carry any subset of page, numPages, and scale.
 * @param ctx The handler context, which provides the updatePageInfo operation to
 * apply the patch to the host state.
 */
export function handlePageInfo(msg: PageInfoMsg, ctx: HandlerContext): void {
  const patch: Partial<PageInfo> = {};
  if (typeof msg.page === 'number') patch.page = msg.page;
  if (typeof msg.numPages === 'number') patch.numPages = msg.numPages;
  if (typeof msg.scale === 'number') patch.scale = msg.scale;
  ctx.updatePageInfo(patch);
}
