import { describe, expect, it } from "vitest"
import { validateMaterialInput } from "@/lib/materialValidation"

describe("validateMaterialInput", () => {
  it("returns no errors when all fields are filled", () => {
    const errors = validateMaterialInput({
      companyName: "회사",
      jobRole: "직무",
      materialText: "자료",
    })
    expect(errors).toEqual({})
  })

  it("flags empty or whitespace-only fields", () => {
    const errors = validateMaterialInput({
      companyName: "",
      jobRole: "   ",
      materialText: "자료",
    })
    expect(errors.companyName).toBeDefined()
    expect(errors.jobRole).toBeDefined()
    expect(errors.materialText).toBeUndefined()
  })
})
