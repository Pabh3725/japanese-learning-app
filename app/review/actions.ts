'use server'

import { archiveCard, restoreCard, type ArchiveResponse } from '@/lib/dal/archive'

export async function archiveCardAction(kind: unknown, cardId: unknown, clientEventId: unknown): Promise<ArchiveResponse> {
  return archiveCard(kind, cardId, clientEventId)
}

export async function restoreCardAction(kind: unknown, cardId: unknown, mode: unknown, clientEventId: unknown): Promise<ArchiveResponse> {
  return restoreCard(kind, cardId, mode, clientEventId)
}
