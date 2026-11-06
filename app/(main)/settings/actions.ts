'use server'

import { saveNewPerDay } from '@/lib/dal/settings'

export async function saveNewPerDayAction(value: unknown): Promise<{ status: 'saved' | 'invalid' }> {
  return saveNewPerDay(value)
}
