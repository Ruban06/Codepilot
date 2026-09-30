'use client'

import { useActionState, useState } from 'react'
import { ingestZip, ingestGitHub } from '@/app/actions/ingest'

type State = { error?: string } | undefined

type Tab = 'zip' | 'github'

export default function IngestForm() {
  const [tab, setTab] = useState<Tab>('zip')

  const [zipState, zipAction, zipPending] = useActionState<State, FormData>(ingestZip, undefined)
  const [githubState, githubAction, githubPending] = useActionState<State, FormData>(
    ingestGitHub,
    undefined
  )

  return (
    <div className="space-y-6">
      {/* Tab switcher */}
      <div className="flex gap-1 rounded-lg border p-1" role="tablist" aria-label="Input type">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'zip'}
          onClick={() => setTab('zip')}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            tab === 'zip'
              ? 'bg-background shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          ZIP Upload
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'github'}
          onClick={() => setTab('github')}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            tab === 'github'
              ? 'bg-background shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          GitHub URL
        </button>
      </div>

      {/* ZIP panel */}
      {tab === 'zip' && (
        <form action={zipAction} className="space-y-4" aria-label="Upload ZIP file">
          {zipState?.error && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {zipState.error}
            </p>
          )}

          <div className="space-y-1">
            <label htmlFor="file" className="block text-sm font-medium">
              ZIP file <span className="text-muted-foreground">(max 10 MB)</span>
            </label>
            <input
              id="file"
              name="file"
              type="file"
              accept=".zip"
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs file:font-medium focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <button
            type="submit"
            disabled={zipPending}
            aria-disabled={zipPending}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {zipPending ? 'Uploading…' : 'Analyse ZIP'}
          </button>
        </form>
      )}

      {/* GitHub panel */}
      {tab === 'github' && (
        <form action={githubAction} className="space-y-4" aria-label="Analyse GitHub repository">
          {githubState?.error && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {githubState.error}
            </p>
          )}

          <div className="space-y-1">
            <label htmlFor="url" className="block text-sm font-medium">
              Repository URL or <code className="text-xs">owner/repo</code>
            </label>
            <input
              id="url"
              name="url"
              type="text"
              required
              placeholder="https://github.com/owner/repo"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <button
            type="submit"
            disabled={githubPending}
            aria-disabled={githubPending}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {githubPending ? 'Fetching…' : 'Analyse repository'}
          </button>
        </form>
      )}
    </div>
  )
}
