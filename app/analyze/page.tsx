import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import IngestForm from './ingest-form'

export const metadata: Metadata = {
  title: 'New analysis',
}

export default async function AnalyzePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-semibold">New analysis</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Upload a ZIP file or provide a GitHub repository URL to generate an AI onboarding report.
      </p>
      <IngestForm />
    </div>
  )
}
