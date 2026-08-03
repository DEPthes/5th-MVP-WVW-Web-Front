export type CareerLevel =
  | "NEWCOMER"
  | "RELATED_EXPERIENCE"
  | "SIMILAR_EXPERIENCE"
  | "SHALLOW_EXPERIENCE"
  | "FULL_TIME"
  | "CONTRACT_FREELANCE"
  | "INTERNSHIP"

export interface UserProfile {
  id: number
  loginId: string
  nickname: string
  desiredPosition: string
}

export interface ApplicationProfile {
  id: number
  companyName: string
  jobPosition: string
  careerLevel: CareerLevel
}

export type InterviewSessionStatus = "COMPLETED" | "FAILED"

export interface InterviewSessionSummary {
  sessionId: number
  companyName: string
  jobPosition: string
  status: InterviewSessionStatus
  createdAt: string
}

export interface InterviewQuestion {
  questionId: number
  sequence: number
  content: string
}

export interface InterviewSessionStart {
  sessionId: number
  status: string
  companyName: string
  jobPosition: string
  careerLevel: CareerLevel
  questions: InterviewQuestion[]
}

export type AnswerStatus = "COMPLETED" | "UPLOADED" | "FAILED"

export interface AnswerSubmitResult {
  answerId: number
  questionId: number
  status: AnswerStatus
}

export interface QuestionAudio {
  questionId: number
  audioUrl: string
  expiresAt: string
}

export interface Competencies {
  thinkingScore: number
  executionScore: number
  collaborationScore: number
  growthScore: number
  adaptabilityScore: number
}

export interface PositionFit {
  fitExperienceScore: number
  fitJobUnderstandingScore: number
  fitOrganizationScore: number
}

export type FeedbackPointType = "STRENGTH" | "WEAKNESS"

export interface FeedbackPoint {
  type: FeedbackPointType
  title: string
  description: string
}

export interface OverallFeedback {
  totalScore: number
  overallSummary: string
  competencies: Competencies
  positionFit: PositionFit
  feedbackPoints: FeedbackPoint[]
}

export interface QuestionFeedback {
  questionId: number
  rationale: string
  improvedAnswer: string
  followUpQuestion: string
}

export interface InterviewQaItem {
  questionId: number
  sequence: number
  questionContent: string
  transcript: string | null
  feedback: QuestionFeedback | null
}

export interface InterviewSessionDetail {
  sessionId: number
  companyName: string
  jobPosition: string
  careerLevel: CareerLevel
  durationMinutes: number
  overallFeedback: OverallFeedback
  qaList: InterviewQaItem[]
}
