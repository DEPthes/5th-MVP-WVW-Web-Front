import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ErrorState } from "@/components/ErrorState"
import { LoadingState } from "@/components/LoadingState"
import { createMaterial } from "@/lib/api"
import {
  validateMaterialInput,
  type MaterialInputErrors,
  type MaterialInputValues,
} from "@/lib/materialValidation"

const INITIAL_VALUES: MaterialInputValues = {
  companyName: "",
  jobRole: "",
  materialText: "",
}

const INPUT_CLASS =
  "rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm"

export function MaterialInputPage() {
  const navigate = useNavigate()
  const [values, setValues] = useState<MaterialInputValues>(INITIAL_VALUES)
  const [errors, setErrors] = useState<MaterialInputErrors>({})
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "submitting" | "error"
  >("idle")
  const [submitError, setSubmitError] = useState<string | null>(null)

  function handleChange(field: keyof MaterialInputValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  function submit() {
    setSubmitStatus("submitting")
    setSubmitError(null)
    createMaterial(values)
      .then((material) => navigate(`/questions/${material.id}`))
      .catch((err) => {
        setSubmitStatus("error")
        setSubmitError(err instanceof Error ? err.message : "저장에 실패했습니다.")
      })
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const nextErrors = validateMaterialInput(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    submit()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h1>기업/직무 + 준비자료 입력</h1>

      <div className="flex flex-col gap-1">
        <label htmlFor="companyName">기업명</label>
        <input
          id="companyName"
          value={values.companyName}
          onChange={(e) => handleChange("companyName", e.target.value)}
          className={INPUT_CLASS}
        />
        {errors.companyName && (
          <p className="text-sm text-destructive">{errors.companyName}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="jobRole">직무</label>
        <input
          id="jobRole"
          value={values.jobRole}
          onChange={(e) => handleChange("jobRole", e.target.value)}
          className={INPUT_CLASS}
        />
        {errors.jobRole && (
          <p className="text-sm text-destructive">{errors.jobRole}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="materialText">준비자료</label>
        <textarea
          id="materialText"
          value={values.materialText}
          onChange={(e) => handleChange("materialText", e.target.value)}
          rows={6}
          className={INPUT_CLASS}
        />
        {errors.materialText && (
          <p className="text-sm text-destructive">{errors.materialText}</p>
        )}
      </div>

      <Button type="submit" disabled={submitStatus === "submitting"}>
        질문 생성하기
      </Button>

      {submitStatus === "submitting" && <LoadingState message="저장하는 중..." />}
      {submitStatus === "error" && (
        <ErrorState message={submitError!} retry={submit} />
      )}
    </form>
  )
}
