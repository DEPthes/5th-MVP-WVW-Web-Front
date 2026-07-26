export interface LoginValues {
  userId: string
  password: string
}

export type LoginErrors = Partial<Record<keyof LoginValues, string>>

export function validateLogin(values: LoginValues): LoginErrors {
  const errors: LoginErrors = {}
  if (!values.userId.trim()) errors.userId = "아이디를 입력해주세요."
  if (!values.password) errors.password = "비밀번호를 입력해주세요."
  return errors
}

export interface SignupValues {
  userId: string
  email: string
  password: string
  name: string
  agreedToTerms: boolean
}

export type SignupErrors = Partial<Record<keyof SignupValues, string>>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateSignup(values: SignupValues): SignupErrors {
  const errors: SignupErrors = {}
  if (!values.userId.trim()) errors.userId = "아이디를 입력해주세요."
  if (!values.email.trim()) {
    errors.email = "이메일을 입력해주세요."
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = "올바른 이메일 형식이 아닙니다."
  }
  if (!values.password) errors.password = "비밀번호를 입력해주세요."
  if (!values.name.trim()) errors.name = "이름을 입력해주세요."
  if (!values.agreedToTerms) {
    errors.agreedToTerms = "약관에 동의해야 가입할 수 있습니다."
  }
  return errors
}
