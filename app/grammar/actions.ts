'use server'

// Grammar: Server Function mỏng, mọi logic ở lib/dal/grammar.ts.
import {
  checkGrammarAnswer,
  finishGrammarTest,
  openGrammarPoint,
  saveTestAnswer,
  startGrammarTest,
  submitGrammarAnswer,
  type GrammarAnswerResponse,
  type GrammarTestResult,
  type GrammarTestView,
} from '@/lib/dal/grammar'
import { markGrammarLearned } from '@/lib/dal/mark-learned'

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

export async function markGrammarLearnedAction(input: unknown): Promise<{ status: 'saved' | 'invalid'; marked?: number }> {
  return markGrammarLearned(input)
}
