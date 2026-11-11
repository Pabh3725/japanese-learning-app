// Grammar: tên 13 dạng bài cho giao diện (tiếng Anh, như phần còn lại của app).
import type { GrammarExercise } from './types'

export const EXERCISE_LABELS: Record<GrammarExercise, { title: string; description: string }> = {
  particle_choice: { title: 'Fill in the particle', description: 'Choose the particle or word for the blank' },
  word_choice: { title: 'Choose the word', description: 'Pick the word that fits the meaning' },
  order: { title: 'Sentence order', description: 'Put the parts in the right order' },
  form_choice: { title: 'Choose the form', description: 'Pick the right form of the verb or adjective' },
  meaning_choice: { title: 'Meaning', description: 'Read the sentence and choose its meaning' },
  translate_build: { title: 'Translate', description: 'Build the Japanese sentence from parts' },
  star: { title: '★ question', description: 'JLPT style: which part goes in ★' },
  find_error: { title: 'Find the mistake', description: 'One underlined part is wrong' },
  clause_match: { title: 'Match the halves', description: 'Join the two halves of each sentence' },
  listening: { title: 'Listening', description: 'Listen and choose the meaning' },
  form_typing: { title: 'Type the form', description: 'Type the right form of the verb' },
  reply_choice: { title: 'Choose the reply', description: 'Pick the right answer to the question' },
  true_false: { title: 'Correct or not', description: 'Decide if the sentence is correct' },
}
