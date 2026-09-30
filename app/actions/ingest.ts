'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Fire-and-forget: POST to /api/analyze/[id] forwarding the session cookie
// so the pipeline route handler can authenticate the request.
// ---------------------------------------------------------------------------
async function triggerPipeline(analysisId: string): Promise<void> {
  const headerStore = await headers()
  const cookie = headerStore.get('cookie') ?? ''
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  // Intentionally not awaited — returns immediately and lets the pipeline run
  fetch(`${siteUrl}/api/analyze/${analysisId}`, {
    method: 'POST',
    headers: { cookie },
  }).catch(() => {
    // Fire-and-forget; errors surface via the analysis status field
  })
}

// ---------------------------------------------------------------------------
// ingestZip — accepts a ZIP file upload, inserts an analysis row, triggers pipeline
// ---------------------------------------------------------------------------
export async function ingestZip(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | undefined> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) {
    return { error: 'Please select a ZIP file.' }
  }
  if (!file.name.endsWith('.zip')) {
    return { error: 'Only .zip files are accepted.' }
  }
  if (file.size > 10 * 1024 * 1024) {
    return { error: 'ZIP file must be under 10 MB.' }
  }

  const name = file.name.replace(/\.zip$/i, '')

  const { data: analysis, error: insertError } = await supabase
    .from('analyses')
    .insert({
      user_id: user.id,
      name,
      input_type: 'zip',
      input_ref: file.name,
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertError || !analysis) {
    return { error: 'Failed to create analysis. Please try again.' }
  }

  await triggerPipeline(analysis.id)
  redirect(`/dashboard/${analysis.id}`)
}

// ---------------------------------------------------------------------------
// ingestGitHub — accepts a GitHub repo URL or owner/repo, triggers pipeline
// ---------------------------------------------------------------------------

// Matches: owner/repo  OR  https://github.com/owner/repo  (with optional .git / trailing slash)
const GITHUB_URL_RE = /^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(\.git)?\/?$/

function parseGitHubInput(raw: string): { owner: string; repo: string } | null {
  // Strip full URL prefix so we're always matching owner/repo
  const stripped = raw
    .trim()
    .replace(/^https?:\/\/github\.com\//, '')
    .replace(/^github\.com\//, '')

  const match = stripped.match(GITHUB_URL_RE)
  if (!match) return null
  return { owner: match[1], repo: match[2] }
}

export async function ingestGitHub(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | undefined> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const raw = (formData.get('url') as string | null)?.trim() ?? ''
  if (!raw) {
    return { error: 'Please enter a GitHub repository URL or owner/repo.' }
  }

  const parsed = parseGitHubInput(raw)
  if (!parsed) {
    return { error: 'Could not parse repository. Use the format owner/repo or a full GitHub URL.' }
  }

  const { owner, repo } = parsed
  const name = `${owner}/${repo}`

  const { data: analysis, error: insertError } = await supabase
    .from('analyses')
    .insert({
      user_id: user.id,
      name,
      input_type: 'github',
      input_ref: name,
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertError || !analysis) {
    return { error: 'Failed to create analysis. Please try again.' }
  }

  await triggerPipeline(analysis.id)
  redirect(`/dashboard/${analysis.id}`)
}
