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

export interface FacialMetrics {
  eyeContactRatio: number
  blinkRate: number
  likabilityScore: number
  tensionScore: number
  neutralScore: number
}

export interface VoiceMetrics {
  fillerWordCount: number
  quietRatio: number
  trembleRatio: number
}

export interface AnswerRecord {
  id: string
  questionId: string
  videoUrl: string
  transcriptText: string | null
  feedbackText: string | null
  durationSeconds: number
  facialMetrics: FacialMetrics
  voiceMetrics: VoiceMetrics
  status: ProcessingStatus
}

export interface PracticeSession {
  id: string
  materialId: string
  createdAt: string
  answers: AnswerRecord[]
}
