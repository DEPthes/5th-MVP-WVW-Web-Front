import { useRef, useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Footer } from "@/components/Footer"
import { Header } from "@/components/Header"
import { LoadingState } from "@/components/LoadingState"
import { signup } from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  validateSignup,
  type SignupErrors,
  type SignupValues,
} from "@/lib/authValidation"

const INITIAL_VALUES: SignupValues = {
  loginId: "",
  email: "",
  password: "",
  confirmPassword: "",
  name: "",
  agreedToPrivacy: false,
}

// 회원가입 API는 토큰을 돌려주지 않으므로 가입 후 로그인 화면으로 이동한다.
const DEFAULT_REDIRECT = "/login"

// ponytail: 실제 개인정보 수집·이용 안내 문구 확정 전 자리표시자.
const PRIVACY_NOTICE = "개인정보 수집 및 이용 안내 문구는 준비 중입니다."

const USER_ID_HINT = "영문, 숫자를 모두 사용하여 8~12자 이내로 입력해 주세요."
const PASSWORD_HINT = "영문, 숫자, 특수 기호를 모두 사용하여 8자 이상 입력해 주세요."

function fieldClass(hasError: boolean) {
  return cn(
    "h-[58px] w-full rounded-[12px] border bg-background px-4 text-sm text-foreground placeholder:text-contents-tertiary focus:outline-none focus:ring-2 focus:ring-ring",
    hasError ? "border-destructive" : "border-input"
  )
}

export function SignupPage() {
  const navigate = useNavigate()
  const [values, setValues] = useState<SignupValues>(INITIAL_VALUES)
  const [errors, setErrors] = useState<SignupErrors>({})
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle")
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const privacyDialogRef = useRef<HTMLDialogElement>(null)

  function handleChange<K extends keyof SignupValues>(
    field: K,
    value: SignupValues[K]
  ) {
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  function submit() {
    setStatus("submitting")
    setSubmitError(null)
    const { loginId, email, password, name, agreedToPrivacy } = values
    signup({ loginId, email, password, name, privacyAgreed: agreedToPrivacy })
      .then(() => {
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
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col p-6">
      <div className="flex justify-center py-11">
      <div className="w-full max-w-[512px] rounded-[20px] border border-border bg-card p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06),0_20px_56px_rgba(53,99,233,0.11)]">
        <h1 className="text-heading font-bold text-foreground">회원가입</h1>
        <p className="mt-2 text-sm text-contents-tertiary">
          AI 면접 플랫폼에 오신 것을 환영합니다.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="email"
              className="text-label font-semibold text-contents-secondary"
            >
              이메일
            </label>
            <input
              id="email"
              type="email"
              value={values.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="이메일을 입력하세요"
              className={fieldClass(Boolean(errors.email))}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="loginId"
              className="text-label font-semibold text-contents-secondary"
            >
              아이디
            </label>
            <input
              id="loginId"
              value={values.loginId}
              onChange={(e) => handleChange("loginId", e.target.value)}
              placeholder="아이디를 입력하세요"
              className={fieldClass(Boolean(errors.loginId))}
            />
            <p
              className={cn(
                "text-xs",
                errors.loginId ? "text-destructive" : "text-contents-tertiary"
              )}
            >
              {errors.loginId ?? USER_ID_HINT}
            </p>
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
                className={cn(fieldClass(Boolean(errors.password)), "pr-11")}
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
            <p
              className={cn(
                "text-xs",
                errors.password ? "text-destructive" : "text-contents-tertiary"
              )}
            >
              {errors.password ?? PASSWORD_HINT}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="confirmPassword"
              className="text-label font-semibold text-contents-secondary"
            >
              비밀번호 확인
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={values.confirmPassword}
                onChange={(e) =>
                  handleChange("confirmPassword", e.target.value)
                }
                placeholder="비밀번호를 다시 입력하세요"
                className={cn(
                  fieldClass(Boolean(errors.confirmPassword)),
                  "pr-11"
                )}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute inset-y-0 right-3 flex items-center text-contents-tertiary"
                aria-label={
                  showConfirmPassword ? "비밀번호 숨기기" : "비밀번호 표시"
                }
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="name"
              className="text-label font-semibold text-contents-secondary"
            >
              이름
            </label>
            <input
              id="name"
              value={values.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="이름을 입력하세요"
              className={fieldClass(Boolean(errors.name))}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="flex flex-col gap-4 rounded-[12px] border border-border bg-[#F9FAFB] p-5">
            <p className="text-label font-semibold text-foreground">
              개인 정보 수집 및 이용 동의
            </p>
            <label className="flex items-center gap-2 text-sm text-contents-secondary">
              <input
                type="checkbox"
                checked={values.agreedToPrivacy}
                onChange={(e) =>
                  handleChange("agreedToPrivacy", e.target.checked)
                }
                className="size-[18px] accent-primary"
              />
              개인 정보 수집 및 이용에 동의합니다.{" "}
              <span className="text-primary">(필수)</span>
            </label>
            <div className="h-px w-full bg-border" />
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full rounded-[10px] text-sm font-normal"
              onClick={() => privacyDialogRef.current?.showModal()}
            >
              개인정보 수집 및 이용 안내
            </Button>
            {errors.agreedToPrivacy && (
              <p className="text-xs text-destructive">
                {errors.agreedToPrivacy}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={status === "submitting"}
            className="h-14 w-full text-label"
          >
            회원가입
          </Button>

          {status === "submitting" && <LoadingState message="가입하는 중..." />}
          {status === "error" && submitError && (
            <p className="text-sm text-destructive">{submitError}</p>
          )}
        </form>

        <div className="mt-6 flex items-center justify-between text-sm">
          <span className="text-contents-tertiary">이미 계정이 있으세요?</span>
          <Link to="/login" className="text-primary underline underline-offset-4">
            로그인
          </Link>
        </div>

        <dialog
          ref={privacyDialogRef}
          className="rounded-lg border border-border p-4 backdrop:bg-black/50"
        >
          <p className="text-sm text-foreground">{PRIVACY_NOTICE}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={() => privacyDialogRef.current?.close()}
          >
            닫기
          </Button>
        </dialog>
      </div>
      </div>
      </div>
      <div className="mx-auto w-full max-w-2xl px-6">
        <Footer />
      </div>
    </div>
  )
}
