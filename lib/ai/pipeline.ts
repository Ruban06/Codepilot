import { GoogleGenerativeAI } from '@google/generative-ai'
import type { AnalysisReport } from '@/types'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const MODEL = 'gemini-3.8-flash'

// Files larger than this (chars) are summarised individually in Pass 1
const CHUNK_CHAR_LIMIT = 6_000
// Total chars we're willing to send to Pass 2
const PASS2_CONTEXT_LIMIT = 80_000

// ---------------------------------------------------------------------------
// Pass 1 — summarise any file that exceeds CHUNK_CHAR_LIMIT
// ---------------------------------------------------------------------------
async function summariseFile(path: string, content: string): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction:
      'You are a senior software engineer. Summarise the following source file concisely. ' +
      'Focus on: what it does, key exports/classes/functions, and notable patterns or dependencies. ' +
      'Keep it under 400 words.',
    generationConfig: { maxOutputTokens: 512 },
  })

  const result = await model.generateContent(
    `File: ${path}\n\n${content.slice(0, 20_000)}`
  )

  return `[summary of ${path}]\n${result.response.text()}`
}

// ---------------------------------------------------------------------------
// Build the context string sent to Pass 2
// ---------------------------------------------------------------------------
async function buildContext(files: Record<string, string>): Promise<string> {
  const parts: string[] = []

  for (const [path, content] of Object.entries(files)) {
    if (content.length > CHUNK_CHAR_LIMIT) {
      const summary = await summariseFile(path, content)
      parts.push(summary)
    } else {
      parts.push(`// ${path}\n${content}`)
    }
  }

  let context = parts.join('\n\n---\n\n')

  // Hard truncate if still over limit
  if (context.length > PASS2_CONTEXT_LIMIT) {
    context = context.slice(0, PASS2_CONTEXT_LIMIT) + '\n\n[truncated]'
  }

  return context
}

// ---------------------------------------------------------------------------
// Pass 2 — generate the full 7-field report in one call
// ---------------------------------------------------------------------------
const REPORT_SYSTEM_PROMPT = `You are an expert software engineer writing an onboarding guide for a new developer joining a project.
Given the codebase context below, produce a JSON object with exactly these seven fields:

{
  "projectStructure": "Markdown description of the directory/file layout and what each area does.",
  "architecture": "Markdown explanation of the high-level architecture, layers, patterns, and how components interact.",
  "keyFiles": "Markdown list of the most important files/modules, one per line, with a brief reason each matters.",
  "howToRun": "Markdown step-by-step guide: prerequisites, install, env vars, dev server, build, test.",
  "beginnerTasks": "Markdown list of 3–5 well-scoped beginner-friendly tasks a new contributor could tackle.",
  "healthSummary": "Markdown paragraph on code quality, test coverage, tech debt, and overall health.",
  "contextSummary": "A single dense paragraph (plain text, no markdown) summarising the entire codebase. This will be used as context for a Q&A assistant — be thorough."
}

Respond with ONLY valid JSON. No markdown fences, no commentary.`

export async function runAnalysisPipeline(
  files: Record<string, string>
): Promise<{ report: AnalysisReport; contextSummary: string }> {
  // Pass 1: reduce large files to summaries
  const context = await buildContext(files)

  // Pass 2: generate report
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: REPORT_SYSTEM_PROMPT,
    generationConfig: { maxOutputTokens: 4096 },
  })

  const result = await model.generateContent(
    `Codebase context:\n\n${context}`
  )

  const raw = result.response.text()

  let parsed: AnalysisReport
  try {
    parsed = JSON.parse(raw) as AnalysisReport
  } catch {
    // Attempt to extract JSON if the model wrapped it in fences despite instructions
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) {
      throw new Error('AI pipeline returned non-JSON output')
    }
    parsed = JSON.parse(match[0]) as AnalysisReport
  }

  // Validate all seven fields are present
  const required: (keyof AnalysisReport)[] = [
    'projectStructure',
    'architecture',
    'keyFiles',
    'howToRun',
    'beginnerTasks',
    'healthSummary',
    'contextSummary',
  ]
  for (const field of required) {
    if (!parsed[field]) {
      parsed[field] = ''
    }
  }

  return {
    report: parsed,
    contextSummary: parsed.contextSummary,
  }
}
