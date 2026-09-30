import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractZip } from '@/lib/ingest/zip'
import { fetchGitHubRepo } from '@/lib/ingest/github'
import { runAnalysisPipeline } from '@/lib/ai/pipeline'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params

  const supabase = await createClient()

  // Authenticate — the session cookie was forwarded by triggerPipeline()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch the analysis row (must belong to this user)
  const { data: analysis, error: fetchError } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !analysis) {
    return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
  }

  // Guard against duplicate runs
  if (analysis.status !== 'pending') {
    return NextResponse.json({ message: 'Already processed' }, { status: 200 })
  }

  try {
    // -----------------------------------------------------------------------
    // Ingestion: build files map depending on input_type
    // -----------------------------------------------------------------------
    let files: Record<string, string>

    if (analysis.input_type === 'github') {
      const [owner, repo] = (analysis.input_ref as string).split('/')
      files = await fetchGitHubRepo(owner, repo)
    } else {
      // ZIP: input_ref is the original filename; we re-fetch the raw body
      // The ZIP bytes were not persisted — re-read from the request body.
      // For ZIP analyses the body is sent as raw bytes by the client upload.
      // However the current architecture stores only metadata at ingest time
      // and does not persist the ZIP bytes. We need the bytes from the
      // original upload — they are not available here. Instead we read the
      // FormData body that was included in the POST from triggerPipeline.
      // Since triggerPipeline does not forward the ZIP, ZIP analyses require
      // the file to be re-uploaded. For now, treat a missing body as an error
      // so the status becomes 'error' rather than hanging on 'pending'.
      const body = await _request.arrayBuffer().catch(() => null)
      if (!body || body.byteLength === 0) {
        throw new Error(
          'ZIP bytes not available in pipeline request. ' +
          'The ZIP must be forwarded as the request body.'
        )
      }
      files = await extractZip(body)
    }

    if (Object.keys(files).length === 0) {
      throw new Error('No readable files found in the provided input.')
    }

    // -----------------------------------------------------------------------
    // AI pipeline — two-pass analysis
    // -----------------------------------------------------------------------
    const { report, contextSummary } = await runAnalysisPipeline(files)

    // -----------------------------------------------------------------------
    // Persist result
    // -----------------------------------------------------------------------
    await supabase
      .from('analyses')
      .update({
        status: 'done',
        report,
        context_summary: contextSummary,
      })
      .eq('id', id)

    return NextResponse.json({ success: true })
  } catch (err) {
    // Mark the analysis as failed so the UI shows the error state
    // instead of hanging on 'pending' forever
    await supabase
      .from('analyses')
      .update({ status: 'error' })
      .eq('id', id)

    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[analyze/${id}] pipeline failed:`, message)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
