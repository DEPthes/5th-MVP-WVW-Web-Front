import { describe, expect, it } from "vitest"
import { validateInterviewSetup } from "@/lib/interviewSetupValidation"

const VALID = {
  companyName: "네이버",
  jobRole: "서비스 기획",
  careerYears: "신입",
  interviewType: "종합 면접",
  durationMinutes: 10,
}

describe("validateInterviewSetup", () => {
  it("returns no errors when all fields are filled", () => {
    expect(validateInterviewSetup(VALID)).toEqual({})
  })

  it("flags empty or whitespace-only required fields", () => {
    const errors = validateInterviewSetup({
      ...VALID,
      companyName: "",
      jobRole: "   ",
    })
    expect(errors.companyName).toBeDefined()
    expect(errors.jobRole).toBeDefined()
  })
})
