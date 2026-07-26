import { describe, expect, it } from "vitest"
import { validateLogin, validateSignup } from "@/lib/authValidation"

describe("validateLogin", () => {
  it("returns no errors when all fields are filled", () => {
    const errors = validateLogin({ userId: "user1", password: "pw" })
    expect(errors).toEqual({})
  })

  it("flags empty or whitespace-only fields", () => {
    const errors = validateLogin({ userId: "   ", password: "" })
    expect(errors.userId).toBeDefined()
    expect(errors.password).toBeDefined()
  })
})

describe("validateSignup", () => {
  const VALID = {
    userId: "user1",
    email: "user1@example.com",
    password: "pw123456",
    name: "홍길동",
    agreedToTerms: true,
  }

  it("returns no errors for valid input", () => {
    expect(validateSignup(VALID)).toEqual({})
  })

  it("flags an invalid email format", () => {
    const errors = validateSignup({ ...VALID, email: "not-an-email" })
    expect(errors.email).toBeDefined()
  })

  it("flags missing terms agreement", () => {
    const errors = validateSignup({ ...VALID, agreedToTerms: false })
    expect(errors.agreedToTerms).toBeDefined()
  })

  it("flags empty required fields", () => {
    const errors = validateSignup({
      userId: "",
      email: "",
      password: "",
      name: "",
      agreedToTerms: false,
    })
    expect(errors.userId).toBeDefined()
    expect(errors.email).toBeDefined()
    expect(errors.password).toBeDefined()
    expect(errors.name).toBeDefined()
    expect(errors.agreedToTerms).toBeDefined()
  })
})
