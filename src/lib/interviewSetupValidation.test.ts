import { describe, expect, it } from "vitest"
import { validateInterviewSetup } from "@/lib/interviewSetupValidation"

const VALID = {
  companyName: "네이버",
  jobPosition: "서비스 기획",
  careerLevel: "NEWCOMER" as const,
  interviewType: "COMPREHENSIVE",
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
      jobPosition: "   ",
    })
    expect(errors.companyName).toBeDefined()
    expect(errors.jobPosition).toBeDefined()
  })
})
