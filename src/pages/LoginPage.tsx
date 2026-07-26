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

const INITIAL_VALUES: LoginValues = { userId: "", password: "", rememberMe: false }

const INPUT_CLASS =
  "rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm"

const DEFAULT_REDIRECT = "/"
const SLOGAN = "혼자서도 실전처럼, AI 면접 코칭"

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [values, setValues] = useState<LoginValues>(INITIAL_VALUES)
  const [errors, setErrors] = useState<LoginErrors>({})
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle")
  const [submitError, setSubmitError] = useState<string | null>(null)

  function handleChange<K extends keyof LoginValues>(field: K, value: LoginValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  function submit() {
    setStatus("submitting")
    setSubmitError(null)
    login(values.userId, values.password)
      .then(({ token }) => {
        setToken(token, values.rememberMe)
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

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.rememberMe}
          onChange={(e) => handleChange("rememberMe", e.target.checked)}
        />
        자동 로그인
      </label>

      <Button type="submit" disabled={status === "submitting"}>
        로그인
      </Button>

      {status === "submitting" && <LoadingState message="로그인하는 중..." />}
      {status === "error" && <ErrorState message={submitError!} retry={submit} />}

      <Link to="/signup" className="text-sm underline">
        회원가입
      </Link>

      <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
        {SLOGAN}
      </p>
    </form>
  )
}
