import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { Analysis } from '@/types'
import StatusPoller from './status-poller'
import ChatPanel from './chat-panel'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('analyses')
    .select('name')
    .eq('id', id)
    .single()

  return {
    title: data?.name ?? 'Analysis',
  }
}

const SECTION_LABELS: Record<string, string> = {
  projectStructure: 'Project Structure',
  architecture: 'Architecture',
  keyFiles: 'Key Files',
  howToRun: 'How to Run',
  beginnerTasks: 'Good First Tasks',
  healthSummary: 'Health Summary',
}

const SECTION_ORDER = [
  'projectStructure',
  'architecture',
  'keyFiles',
  'howToRun',
  'beginnerTasks',
  'healthSummary',
] as const

function StatusBadge({ status }: { status: Analysis['status'] }) {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-800',
    done: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
  }
  const labels = {
    pending: 'Analysing…',
    done: 'Done',
    error: 'Error',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

export default async function AnalysisDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: analysis } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!analysis) {
    notFound()
  }

  const { data: chatMessages } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('analysis_id', id)
    .order('created_at', { ascending: true })

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <StatusPoller status={analysis.status} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{analysis.name}</h1>
          <p className="text-sm text-muted-foreground">
            {analysis.input_type === 'github' ? '🔗 GitHub' : '📦 ZIP'} ·{' '}
            {new Date(analysis.created_at).toLocaleDateString()}
          </p>
        </div>
        <StatusBadge status={analysis.status} />
      </div>

      {/* Pending state */}
      {analysis.status === 'pending' && (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Analysis is running… this usually takes 30–60 seconds. The page will update automatically.
        </div>
      )}

      {/* Error state */}
      {analysis.status === 'error' && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800" role="alert">
          The analysis failed. Please try again by submitting the codebase once more.
        </div>
      )}

      {/* Report sections */}
      {analysis.status === 'done' && analysis.report && (
        <div className="space-y-6">
          {SECTION_ORDER.map((key) => {
            const content = analysis.report![key]
            if (!content) return null
            return (
              <section key={key} className="rounded-lg border p-6">
                <h2 className="mb-3 font-semibold">{SECTION_LABELS[key]}</h2>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm text-foreground">
                  {content}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {/* Chat panel — only available once analysis is done */}
      {analysis.status === 'done' && (
        <ChatPanel
          analysisId={id}
          initialMessages={chatMessages ?? []}
        />
      )}
    </div>
  )
}
