export interface LoginValues {
  userId: string
  password: string
  rememberMe: boolean
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
  confirmPassword: string
  name: string
  agreedToPrivacy: boolean
}

export type SignupErrors = Partial<Record<keyof SignupValues, string>>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// 영문, 숫자를 모두 사용하여 8-12자 (화면설계서 회원가입 목업 기준)
const USER_ID_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9]{8,12}$/
// 영문, 숫자, 특수기호를 모두 사용하여 8자 이상
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

export function validateSignup(values: SignupValues): SignupErrors {
  const errors: SignupErrors = {}
  if (!values.userId.trim()) {
    errors.userId = "아이디를 입력해주세요."
  } else if (!USER_ID_PATTERN.test(values.userId.trim())) {
    errors.userId = "영문, 숫자를 모두 사용하여 8-12자 이내로 입력해 주세요."
  }
  if (!values.email.trim()) {
    errors.email = "이메일을 입력해주세요."
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = "올바른 이메일 형식이 아닙니다."
  }
  if (!values.password) {
    errors.password = "비밀번호를 입력해주세요."
  } else if (!PASSWORD_PATTERN.test(values.password)) {
    errors.password = "영문, 숫자, 특수기호를 모두 사용하여 8자 이상 입력해주세요."
  }
  if (values.confirmPassword !== values.password) {
    errors.confirmPassword = "비밀번호가 일치하지 않습니다."
  }
  if (!values.name.trim()) errors.name = "이름을 입력해주세요."
  if (!values.agreedToPrivacy) {
    errors.agreedToPrivacy = "개인정보 수집 및 이용에 동의해야 가입할 수 있습니다."
  }
  return errors
}
