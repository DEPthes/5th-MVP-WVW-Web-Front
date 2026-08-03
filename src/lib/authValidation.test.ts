import { describe, expect, it } from "vitest"
import { validateLogin, validateSignup } from "@/lib/authValidation"

describe("validateLogin", () => {
  it("returns no errors when all fields are filled", () => {
    const errors = validateLogin({ loginId: "user1", password: "pw", rememberMe: false })
    expect(errors).toEqual({})
  })

  it("flags empty or whitespace-only fields", () => {
    const errors = validateLogin({ loginId: "   ", password: "", rememberMe: false })
    expect(errors.loginId).toBeDefined()
    expect(errors.password).toBeDefined()
  })
})

describe("validateSignup", () => {
  const VALID = {
    loginId: "user1234",
    email: "user1@example.com",
    password: "pw123456!",
    confirmPassword: "pw123456!",
    name: "홍길동",
    agreedToPrivacy: true,
  }

  it("returns no errors for valid input", () => {
    expect(validateSignup(VALID)).toEqual({})
  })

  it("flags an invalid email format", () => {
    const errors = validateSignup({ ...VALID, email: "not-an-email" })
    expect(errors.email).toBeDefined()
  })

  it("flags a loginId that doesn't meet the format rule", () => {
    const errors = validateSignup({ ...VALID, loginId: "short" })
    expect(errors.loginId).toBeDefined()
  })

  it("flags a password missing a required character class", () => {
    const errors = validateSignup({
      ...VALID,
      password: "onlyletters",
      confirmPassword: "onlyletters",
    })
    expect(errors.password).toBeDefined()
  })

  it("flags mismatched password confirmation", () => {
    const errors = validateSignup({ ...VALID, confirmPassword: "different1!" })
    expect(errors.confirmPassword).toBeDefined()
  })

  it("flags missing privacy agreement", () => {
    const errors = validateSignup({ ...VALID, agreedToPrivacy: false })
    expect(errors.agreedToPrivacy).toBeDefined()
  })

  it("flags empty required fields", () => {
    const errors = validateSignup({
      loginId: "",
      email: "",
      password: "",
      confirmPassword: "",
      name: "",
      agreedToPrivacy: false,
    })
    expect(errors.loginId).toBeDefined()
    expect(errors.email).toBeDefined()
    expect(errors.password).toBeDefined()
    expect(errors.name).toBeDefined()
    expect(errors.agreedToPrivacy).toBeDefined()
  })
})
