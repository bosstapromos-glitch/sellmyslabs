import { catalogConfigured, requestCatalog } from './catalog-server';
import { referenceIdentity } from './catalog-identity';
import { isGradedSlab } from './alt-research';
export async function prepareSlabResearch(cards) {
  if (!catalogConfigured()) return;
  const identities = cards.filter(isGradedSlab).slice(0, 50).map(referenceIdentity);
  if (identities.length) await requestCatalog('prewarm', { cards: identities });
}
