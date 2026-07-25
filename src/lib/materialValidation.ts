export interface MaterialInputValues {
  companyName: string
  jobRole: string
  materialText: string
}

export type MaterialInputErrors = Partial<Record<keyof MaterialInputValues, string>>

export function validateMaterialInput(
  values: MaterialInputValues
): MaterialInputErrors {
  const errors: MaterialInputErrors = {}
  if (!values.companyName.trim()) errors.companyName = "기업명을 입력해주세요."
  if (!values.jobRole.trim()) errors.jobRole = "직무를 입력해주세요."
  if (!values.materialText.trim()) errors.materialText = "준비자료를 입력해주세요."
  return errors
}
