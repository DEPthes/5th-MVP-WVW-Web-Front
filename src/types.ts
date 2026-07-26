export type ProcessingStatus = "PENDING" | "DONE" | "FAILED"

export interface ApplicantProfile {
  id: string
  companyName: string
  jobRole: string
  careerYears: string
}

export interface InterviewSetup {
  id: string
  companyName: string
  jobRole: string
  careerYears: string
  interviewType: string
  durationMinutes: number
}

export interface Question {
  id: string
  text: string
}

export interface QuestionSet {
  id: string
  interviewId: string
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
  interviewId: string
  createdAt: string
  answers: AnswerRecord[]
}
