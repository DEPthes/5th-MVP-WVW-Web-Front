import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ErrorState } from "@/components/ErrorState"
import { LoadingState } from "@/components/LoadingState"
import { setToken, signup } from "@/lib/api"
import {
  validateSignup,
  type SignupErrors,
  type SignupValues,
} from "@/lib/authValidation"

const INITIAL_VALUES: SignupValues = {
  userId: "",
  email: "",
  password: "",
  name: "",
  agreedToTerms: false,
}

const INPUT_CLASS =
  "rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm"

// ponytail: 기획서상 회원가입 후 "초기 프로필 설정"으로 이동해야 하나 해당 화면 미구현 — 홈으로 임시 대체.
const DEFAULT_REDIRECT = "/"

export function SignupPage() {
  const navigate = useNavigate()
  const [values, setValues] = useState<SignupValues>(INITIAL_VALUES)
  const [errors, setErrors] = useState<SignupErrors>({})
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle")
  const [submitError, setSubmitError] = useState<string | null>(null)

  function handleChange<K extends keyof SignupValues>(
    field: K,
    value: SignupValues[K]
  ) {
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  function submit() {
    setStatus("submitting")
    setSubmitError(null)
    const { userId, email, password, name } = values
    signup({ userId, email, password, name })
      .then(({ token }) => {
        setToken(token)
        navigate(DEFAULT_REDIRECT, { replace: true })
      })
      .catch((err) => {
        setStatus("error")
        setSubmitError(
          err instanceof Error ? err.message : "회원가입에 실패했습니다."
        )
      })
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const nextErrors = validateSignup(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    submit()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h1>회원가입</h1>

      <div className="flex flex-col gap-1">
        <label htmlFor="userId">아이디</label>
        <input
          id="userId"
          value={values.userId}
          onChange={(e) => handleChange("userId", e.target.value)}
          className={INPUT_CLASS}
        />
        {errors.userId && <p className="text-sm text-destructive">{errors.userId}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="email">이메일</label>
        <input
          id="email"
          type="email"
          value={values.email}
          onChange={(e) => handleChange("email", e.target.value)}
          className={INPUT_CLASS}
        />
        {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
        <p className="text-xs text-muted-foreground">
          비밀번호 재설정 시에만 사용됩니다.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password">비밀번호</label>
        <input
          id="password"
          type="password"
          value={values.password}
          onChange={(e) => handleChange("password", e.target.value)}
          className={INPUT_CLASS}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="name">이름</label>
        <input
          id="name"
          value={values.name}
          onChange={(e) => handleChange("name", e.target.value)}
          className={INPUT_CLASS}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.agreedToTerms}
            onChange={(e) => handleChange("agreedToTerms", e.target.checked)}
          />
          이용약관 및 개인정보처리방침에 동의합니다.
        </label>
        {errors.agreedToTerms && (
          <p className="text-sm text-destructive">{errors.agreedToTerms}</p>
        )}
      </div>

      <Button type="submit" disabled={status === "submitting"}>
        회원가입
      </Button>

      {status === "submitting" && <LoadingState message="가입하는 중..." />}
      {status === "error" && <ErrorState message={submitError!} retry={submit} />}

      <Link to="/login" className="text-sm underline">
        로그인으로 돌아가기
      </Link>
    </form>
  )
}
