import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { VerbSetup } from '@/components/verbs/verb-setup'
import { getVerbOverview } from '@/lib/dal/verbs'

export const metadata: Metadata = { title: 'Verb forms · Nihongo' }

export default async function VerbFormsPage() {
  const v = await getVerbOverview()
  return (
    <>
      <PageHeader eyebrow="活用" title="Verb forms" description={`Practice conjugating verbs and adjectives. Each form opens with the lesson that teaches it. You have learned ${v.learnedVerbs} verbs and ${v.learnedAdjectives} adjectives; those come first.`} />
      <VerbSetup forms={v.forms} />
    </>
  )
}
