import { useState, type FormEvent } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ErrorState } from "@/components/ErrorState"
import { LoadingState } from "@/components/LoadingState"
import { login, setToken } from "@/lib/api"
import {
  validateLogin,
  type LoginErrors,
  type LoginValues,
} from "@/lib/authValidation"

const INITIAL_VALUES: LoginValues = { userId: "", password: "" }

const INPUT_CLASS =
  "rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm"

// ponytail: 홈 화면이 아직 없어 임시 기본 이동 경로. 홈 완성되면 "/"로 교체.
const DEFAULT_REDIRECT = "/materials/new"

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [values, setValues] = useState<LoginValues>(INITIAL_VALUES)
  const [errors, setErrors] = useState<LoginErrors>({})
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle")
  const [submitError, setSubmitError] = useState<string | null>(null)

  function handleChange(field: keyof LoginValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  function submit() {
    setStatus("submitting")
    setSubmitError(null)
    login(values.userId, values.password)
      .then(({ token }) => {
        setToken(token)
        const from =
          (location.state as { from?: { pathname: string } } | null)?.from
            ?.pathname ?? DEFAULT_REDIRECT
        navigate(from, { replace: true })
      })
      .catch((err) => {
        setStatus("error")
        setSubmitError(
          err instanceof Error ? err.message : "로그인에 실패했습니다."
        )
      })
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const nextErrors = validateLogin(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    submit()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h1>로그인</h1>

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

      <Button type="submit" disabled={status === "submitting"}>
        로그인
      </Button>

      {status === "submitting" && <LoadingState message="로그인하는 중..." />}
      {status === "error" && <ErrorState message={submitError!} retry={submit} />}

      <Link to="/signup" className="text-sm underline">
        회원가입
      </Link>
    </form>
  )
}
