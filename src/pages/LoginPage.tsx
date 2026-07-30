import { useState, type FormEvent } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Footer } from "@/components/Footer"
import { LoadingState } from "@/components/LoadingState"
import { login, setToken } from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  validateLogin,
  type LoginErrors,
  type LoginValues,
} from "@/lib/authValidation"

const INITIAL_VALUES: LoginValues = { userId: "", password: "", rememberMe: false }

const DEFAULT_REDIRECT = "/"

function fieldClass(hasError: boolean) {
  return cn(
    "h-14 w-full rounded-[12px] border bg-background px-4 text-sm text-foreground placeholder:text-contents-tertiary focus:outline-none focus:ring-2 focus:ring-ring",
    hasError ? "border-destructive" : "border-input"
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [values, setValues] = useState<LoginValues>(INITIAL_VALUES)
  const [errors, setErrors] = useState<LoginErrors>({})
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle")
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

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

  const hasCredentialError = status === "error"

  return (
    <div className="mx-auto flex max-w-2xl flex-col p-6">
      <div className="flex justify-center py-12">
      <div className="w-full max-w-[440px] rounded-[20px] border border-border bg-card p-10 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_20px_56px_rgba(53,99,233,0.11)]">
        <h1 className="text-heading font-bold text-foreground">로그인</h1>
        <p className="mt-2 text-sm text-contents-tertiary">
          AI와 함께 면접을 준비하세요.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="userId"
              className="text-label font-semibold text-contents-secondary"
            >
              아이디
            </label>
            <input
              id="userId"
              value={values.userId}
              onChange={(e) => handleChange("userId", e.target.value)}
              placeholder="아이디를 입력하세요"
              className={fieldClass(Boolean(errors.userId) || hasCredentialError)}
            />
            {errors.userId && (
              <p className="text-sm text-destructive">{errors.userId}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="password"
              className="text-label font-semibold text-contents-secondary"
            >
              비밀번호
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={values.password}
                onChange={(e) => handleChange("password", e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className={cn(
                  fieldClass(Boolean(errors.password) || hasCredentialError),
                  "pr-11"
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-3 flex items-center text-contents-tertiary"
                aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password}</p>
            )}
          </div>

          {hasCredentialError && submitError && (
            <p className="text-sm text-destructive">{submitError}</p>
          )}

          <label className="flex items-center gap-2 text-sm text-contents-secondary">
            <input
              type="checkbox"
              checked={values.rememberMe}
              onChange={(e) => handleChange("rememberMe", e.target.checked)}
              className="size-[18px] accent-primary"
            />
            자동 로그인
          </label>

          <Button
            type="submit"
            disabled={status === "submitting"}
            className="h-14 w-full text-label"
          >
            로그인
          </Button>

          {status === "submitting" && <LoadingState message="로그인하는 중..." />}
        </form>

        <div className="mt-6 flex items-center justify-between text-sm">
          <span className="text-contents-tertiary">아이디가 없으세요?</span>
          <Link
            to="/signup"
            className="text-primary underline underline-offset-4"
          >
            회원가입
          </Link>
        </div>
      </div>
      </div>
      <Footer />
    </div>
  )
}
