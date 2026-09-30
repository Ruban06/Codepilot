import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { Analysis } from '@/types'

export const metadata: Metadata = {
  title: 'Dashboard',
}

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

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: analyses } = await supabase
    .from('analyses')
    .select('id, name, input_type, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-xl font-semibold">Your analyses</h1>

      {(!analyses || analyses.length === 0) ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">No analyses yet.</p>
          <Link
            href="/analyze"
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Start your first analysis
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {analyses.map((analysis) => (
            <Link
              key={analysis.id}
              href={`/dashboard/${analysis.id}`}
              className="flex flex-col gap-2 rounded-lg border p-5 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium leading-snug">{analysis.name}</span>
                <StatusBadge status={analysis.status} />
              </div>
              <p className="text-xs text-muted-foreground">
                {analysis.input_type === 'github' ? '🔗 GitHub' : '📦 ZIP'} ·{' '}
                {new Date(analysis.created_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
