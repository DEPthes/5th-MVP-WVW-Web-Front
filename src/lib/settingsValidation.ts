export interface ProfileValues {
  nickname: string
  desiredPosition: string
}

export type ProfileErrors = Partial<Record<keyof ProfileValues, string>>

export function validateProfile(values: ProfileValues): ProfileErrors {
  const errors: ProfileErrors = {}
  if (!values.nickname.trim()) errors.nickname = "닉네임을 입력해주세요."
  if (!values.desiredPosition.trim()) {
    errors.desiredPosition = "관심 직무를 입력해주세요."
  }
  return errors
}

export interface PasswordChangeValues {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export type PasswordChangeErrors = Partial<
  Record<keyof PasswordChangeValues, string>
>

export function validatePasswordChange(
  values: PasswordChangeValues
): PasswordChangeErrors {
  const errors: PasswordChangeErrors = {}
  if (!values.currentPassword) errors.currentPassword = "현재 비밀번호를 입력해주세요."
  if (!values.newPassword) errors.newPassword = "새 비밀번호를 입력해주세요."
  if (values.newPassword !== values.confirmPassword) {
    errors.confirmPassword = "새 비밀번호가 일치하지 않습니다."
  }
  return errors
}
