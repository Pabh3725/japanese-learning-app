'use server'

// Grammar: Server Function mỏng, mọi logic ở lib/dal/grammar.ts.
import { checkGrammarAnswer, openGrammarPoint, submitGrammarAnswer, type GrammarAnswerResponse } from '@/lib/dal/grammar'
import { finishGrammarTest, saveTestAnswer, startGrammarTest, type GrammarTestResult, type GrammarTestView } from '@/lib/dal/grammar-test'
import { markGrammarLearned, undoGrammarLearned } from '@/lib/dal/mark-learned'
import { checkV3Bai, submitV3Bai } from '@/lib/dal/grammar-v3'
import type { V3SubmitResponse } from '@/lib/grammar/v3/public'

export async function openGrammarPointAction(code: unknown): Promise<{ status: 'saved' | 'invalid' | 'locked' }> {
  return openGrammarPoint(code)
}

export async function submitGrammarAnswerAction(input: unknown): Promise<GrammarAnswerResponse> {
  return submitGrammarAnswer(input)
}

export async function checkGrammarAnswerAction(input: unknown): Promise<GrammarAnswerResponse> {
  return checkGrammarAnswer(input)
}

export async function startGrammarTestAction(input: unknown): Promise<GrammarTestView | { status: 'invalid' | 'not_ready' }> {
  return startGrammarTest(input)
}

export async function saveTestAnswerAction(input: unknown): Promise<{ status: 'saved' | 'invalid' | 'not_found' }> {
  return saveTestAnswer(input)
}

export async function finishGrammarTestAction(id: unknown): Promise<GrammarTestResult | { status: 'not_found' }> {
  return finishGrammarTest(id)
}

export async function undoGrammarLearnedAction(input: unknown): Promise<{ status: 'saved' | 'invalid'; undone?: number }> {
  return undoGrammarLearned(input)
}

export async function markGrammarLearnedAction(input: unknown): Promise<{ status: 'saved' | 'invalid'; marked?: number }> {
  return markGrammarLearned(input)
}

// Grammar V3: bài 5 câu
export async function submitV3BaiAction(input: unknown): Promise<V3SubmitResponse> {
  return submitV3Bai(input)
}

export async function checkV3BaiAction(input: unknown): Promise<V3SubmitResponse> {
  return checkV3Bai(input)
}
