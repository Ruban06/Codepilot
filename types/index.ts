export type AnalysisStatus = 'pending' | 'done' | 'error'
export type InputType = 'zip' | 'github'

export interface AnalysisReport {
  projectStructure: string
  architecture: string
  keyFiles: string
  howToRun: string
  beginnerTasks: string
  healthSummary: string
  contextSummary: string
}

export interface Analysis {
  id: string
  user_id: string
  name: string
  input_type: InputType
  input_ref: string
  status: AnalysisStatus
  report: AnalysisReport | null
  context_summary: string | null
  created_at: string
}

export interface ChatMessage {
  id: string
  analysis_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}
