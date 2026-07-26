export type ProcessingStatus = "PENDING" | "DONE" | "FAILED"

export interface PreparationMaterial {
  id: string
  companyName: string
  jobRole: string
  materialText: string
}

export interface Question {
  id: string
  text: string
}

export interface QuestionSet {
  id: string
  materialId: string
  questions: Question[]
}

export interface AnswerRecord {
  id: string
  questionId: string
  transcriptText: string | null
  feedbackText: string | null
  durationSeconds: number
  status: ProcessingStatus
}

export interface PracticeSession {
  id: string
  materialId: string
  createdAt: string
  answers: AnswerRecord[]
}
