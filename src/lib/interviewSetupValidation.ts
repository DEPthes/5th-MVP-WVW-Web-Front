export interface InterviewSetupValues {
  companyName: string
  jobRole: string
  careerYears: string
  interviewType: string
  durationMinutes: number
}

export type InterviewSetupErrors = Partial<
  Record<keyof InterviewSetupValues, string>
>

export function validateInterviewSetup(
  values: InterviewSetupValues
): InterviewSetupErrors {
  const errors: InterviewSetupErrors = {}
  if (!values.companyName.trim()) errors.companyName = "기업을 입력해주세요."
  if (!values.jobRole.trim()) errors.jobRole = "지원 직무를 입력해주세요."
  return errors
}
