import { describe, expect, it } from "vitest"
import { validatePasswordChange, validateProfile } from "@/lib/settingsValidation"

describe("validateProfile", () => {
  it("returns no errors when all fields are filled", () => {
    expect(
      validateProfile({ nickname: "닉네임", interestedJobRole: "백엔드" })
    ).toEqual({})
  })

  it("flags empty or whitespace-only fields", () => {
    const errors = validateProfile({ nickname: "", interestedJobRole: "   " })
    expect(errors.nickname).toBeDefined()
    expect(errors.interestedJobRole).toBeDefined()
  })
})

describe("validatePasswordChange", () => {
  const VALID = {
    currentPassword: "old-pw",
    newPassword: "new-pw",
    confirmPassword: "new-pw",
  }

  it("returns no errors for matching passwords", () => {
    expect(validatePasswordChange(VALID)).toEqual({})
  })

  it("flags mismatched confirmation", () => {
    const errors = validatePasswordChange({ ...VALID, confirmPassword: "different" })
    expect(errors.confirmPassword).toBeDefined()
  })

  it("flags missing current or new password", () => {
    const errors = validatePasswordChange({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    })
    expect(errors.currentPassword).toBeDefined()
    expect(errors.newPassword).toBeDefined()
  })
})
