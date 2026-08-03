import { useEffect, useRef, useState, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { AlertTriangle, ChevronDown, Eye, EyeOff, User, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ErrorState } from "@/components/ErrorState"
import { LoadingState } from "@/components/LoadingState"
import { cn } from "@/lib/utils"
import {
  changePassword,
  clearToken,
  getUserProfile,
  updateUserProfile,
  withdrawAccount,
} from "@/lib/api"
import {
  validatePasswordChange,
  validateProfile,
  type PasswordChangeErrors,
  type PasswordChangeValues,
  type ProfileErrors,
  type ProfileValues,
} from "@/lib/settingsValidation"

// ponytail: 화면설계서에 관심 직무 옵션 목록이 명시되어 있지 않아 임의 구성 — 실제 목록 확정 시 교체
const JOB_OPTIONS = [
  "서비스 기획",
  "프론트엔드 개발",
  "백엔드 개발",
  "디자인",
  "마케팅",
  "영업",
  "인사",
  "기타",
]

const FIELD_CLASS =
  "h-12 w-full rounded-[12px] border border-input bg-background px-4 text-[15px] text-foreground placeholder:text-contents-tertiary focus:outline-none focus:ring-2 focus:ring-ring"
const LABEL_CLASS = "text-sm font-medium text-contents-secondary"

function Card({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-[20px] bg-card p-8 shadow-[0_4px_10px_rgba(0,0,0,0.06)]">
      {children}
    </section>
  )
}

export function SettingsPage() {
  const navigate = useNavigate()

  const [userId, setUserId] = useState("")
  const [profile, setProfile] = useState<ProfileValues>({
    nickname: "",
    interestedJobRole: "",
  })
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({})
  const [profileStatus, setProfileStatus] = useState<
    "idle" | "submitting" | "error" | "saved"
  >("idle")
  const [profileError, setProfileError] = useState<string | null>(null)

  useEffect(() => {
    // ponytail: getUserProfile() API 대기 중 — 실패해도 빈 폼으로 계속 진행
    getUserProfile()
      .then((data) => {
        setUserId(data.userId)
        setProfile({ nickname: data.nickname, interestedJobRole: data.interestedJobRole })
      })
      .catch(() => {})
  }, [])

  function handleProfileChange(field: keyof ProfileValues, value: string) {
    setProfile((prev) => ({ ...prev, [field]: value }))
  }

  function saveProfile() {
    setProfileStatus("submitting")
    setProfileError(null)
    updateUserProfile(profile)
      .then(() => setProfileStatus("saved"))
      .catch((err) => {
        setProfileStatus("error")
        setProfileError(err instanceof Error ? err.message : "저장에 실패했습니다.")
      })
  }

  function handleProfileSubmit() {
    const nextErrors = validateProfile(profile)
    setProfileErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    saveProfile()
  }

  const [passwordValues, setPasswordValues] = useState<PasswordChangeValues>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [passwordErrors, setPasswordErrors] = useState<PasswordChangeErrors>({})
  const [passwordStatus, setPasswordStatus] = useState<
    "idle" | "submitting" | "error" | "done"
  >("idle")
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [visiblePassword, setVisiblePassword] = useState<
    Partial<Record<keyof PasswordChangeValues, boolean>>
  >({})

  function handlePasswordChange(field: keyof PasswordChangeValues, value: string) {
    setPasswordValues((prev) => ({ ...prev, [field]: value }))
  }

  function toggleVisiblePassword(field: keyof PasswordChangeValues) {
    setVisiblePassword((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  function submitPasswordChange() {
    setPasswordStatus("submitting")
    setPasswordError(null)
    changePassword(passwordValues)
      .then(() => {
        setPasswordStatus("done")
        setPasswordValues({ currentPassword: "", newPassword: "", confirmPassword: "" })
      })
      .catch((err) => {
        setPasswordStatus("error")
        setPasswordError(
          err instanceof Error ? err.message : "비밀번호 변경에 실패했습니다."
        )
      })
  }

  function handlePasswordSubmit() {
    const nextErrors = validatePasswordChange(passwordValues)
    setPasswordErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    submitPasswordChange()
  }

  function handleLogout() {
    clearToken()
    navigate("/login")
  }

  const withdrawDialogRef = useRef<HTMLDialogElement>(null)
  const [withdrawStatus, setWithdrawStatus] = useState<"idle" | "submitting" | "error">(
    "idle"
  )
  const [withdrawError, setWithdrawError] = useState<string | null>(null)

  function submitWithdraw() {
    setWithdrawStatus("submitting")
    setWithdrawError(null)
    withdrawAccount()
      .then(() => {
        clearToken()
        navigate("/login")
      })
      .catch((err) => {
        setWithdrawStatus("error")
        setWithdrawError(
          err instanceof Error ? err.message : "탈퇴 처리에 실패했습니다."
        )
      })
  }

  const passwordFields: {
    field: keyof PasswordChangeValues
    label: string
    placeholder: string
  }[] = [
    {
      field: "currentPassword",
      label: "현재 비밀번호",
      placeholder: "현재 비밀번호를 입력하세요",
    },
    {
      field: "newPassword",
      label: "새 비밀번호",
      placeholder: "새 비밀번호를 입력하세요",
    },
    {
      field: "confirmPassword",
      label: "새 비밀번호 확인",
      placeholder: "새 비밀번호를 다시 입력하세요",
    },
  ]

  return (
    <div className="-m-8 flex flex-col">
      <div className="border-b border-border px-8 pt-6 pb-4">
        <h1 className="text-[20px] leading-[30px] font-semibold text-foreground">설정</h1>
      </div>

      <div className="flex flex-col gap-6 p-8">
      <Card>
        <h2 className="text-label font-bold text-foreground">프로필 수정</h2>
        <p className="mt-1.5 text-sm text-contents-tertiary">
          지원하고자 하는 직무를 선택하고 프로필을 설정할 수 있습니다.
        </p>

        <div className="mt-6 flex items-start gap-7">
          <div className="flex size-[88px] shrink-0 items-center justify-center rounded-full border-2 border-[#C5D4FB] bg-[#F0F4FF]">
            <User size={32} className="text-primary" />
          </div>

          <div className="flex flex-1 flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="nickname" className={LABEL_CLASS}>
                닉네임
              </label>
              <input
                id="nickname"
                value={profile.nickname}
                onChange={(e) => handleProfileChange("nickname", e.target.value)}
                placeholder="닉네임을 입력하세요"
                className={FIELD_CLASS}
              />
              {profileErrors.nickname && (
                <p className="text-xs text-destructive">{profileErrors.nickname}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="interestedJobRole" className={LABEL_CLASS}>
                관심 직무
              </label>
              <div className="relative">
                <select
                  id="interestedJobRole"
                  value={profile.interestedJobRole}
                  onChange={(e) =>
                    handleProfileChange("interestedJobRole", e.target.value)
                  }
                  className={cn(FIELD_CLASS, "appearance-none pr-10")}
                >
                  <option value="" disabled>
                    직무를 선택하세요
                  </option>
                  {JOB_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-contents-tertiary"
                />
              </div>
              {profileErrors.interestedJobRole && (
                <p className="text-xs text-destructive">
                  {profileErrors.interestedJobRole}
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleProfileSubmit}
                disabled={profileStatus === "submitting"}
              >
                저장
              </Button>
            </div>
            {profileStatus === "submitting" && (
              <LoadingState message="저장하는 중..." />
            )}
            {profileStatus === "saved" && (
              <p className="text-right text-sm text-contents-tertiary">
                저장되었습니다.
              </p>
            )}
            {profileStatus === "error" && (
              <ErrorState message={profileError!} retry={saveProfile} />
            )}
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-label font-bold text-foreground">계정 관리</h2>
        <p className="mt-1.5 text-sm text-contents-tertiary">
          로그인 정보와 비밀번호를 변경하거나 로그아웃 및 회원탈퇴를 할 수 있습니다.
        </p>

        <div className="mt-7 flex items-center justify-between">
          <span className="text-base font-semibold text-foreground">로그인 정보</span>
          <Button
            type="button"
            variant="outline"
            onClick={handleLogout}
            className="h-10 rounded-[10px] border-[#E8EAF0] px-5 text-sm"
          >
            로그아웃
          </Button>
        </div>
        <div className="mt-3 flex flex-col gap-1.5">
          <label htmlFor="loginInfo" className={LABEL_CLASS}>
            이메일
          </label>
          <input
            id="loginInfo"
            value={userId}
            readOnly
            className={cn(FIELD_CLASS, "border-[#F0F2F5] bg-[#F8FAFB] text-contents-tertiary")}
          />
          <p className="text-xs text-contents-tertiary">
            로그인 정보는 변경할 수 없습니다. 변경이 필요하면 관리자에게 문의해주세요.
          </p>
        </div>

        <div className="my-7 h-px w-full bg-[#F0F2F5]" />

        <div className="flex items-center justify-between">
          <span className="text-base font-semibold text-foreground">비밀번호 변경</span>
          <Button
            type="button"
            onClick={handlePasswordSubmit}
            disabled={passwordStatus === "submitting"}
          >
            비밀번호 변경
          </Button>
        </div>
        <div className="mt-4 flex flex-col gap-4">
          {passwordFields.map(({ field, label, placeholder }) => (
            <div key={field} className="flex flex-col gap-1.5">
              <label htmlFor={field} className={LABEL_CLASS}>
                {label}
              </label>
              <div className="relative">
                <input
                  id={field}
                  type={visiblePassword[field] ? "text" : "password"}
                  value={passwordValues[field]}
                  onChange={(e) => handlePasswordChange(field, e.target.value)}
                  placeholder={placeholder}
                  className={cn(FIELD_CLASS, "pr-11")}
                />
                <button
                  type="button"
                  onClick={() => toggleVisiblePassword(field)}
                  className="absolute inset-y-0 right-3 flex items-center text-contents-tertiary"
                  aria-label={visiblePassword[field] ? "비밀번호 숨기기" : "비밀번호 표시"}
                >
                  {visiblePassword[field] ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {passwordErrors[field] && (
                <p className="text-xs text-destructive">{passwordErrors[field]}</p>
              )}
            </div>
          ))}
          {passwordStatus === "submitting" && (
            <LoadingState message="변경하는 중..." />
          )}
          {passwordStatus === "done" && (
            <p className="text-sm text-contents-tertiary">비밀번호가 변경되었습니다.</p>
          )}
          {passwordStatus === "error" && (
            <ErrorState message={passwordError!} retry={submitPasswordChange} />
          )}
        </div>

        <div className="my-7 h-px w-full bg-[#F0F2F5]" />

        <div className="flex flex-col gap-4 rounded-[14px] border border-[#FECACA] bg-[#FEF2F2] px-6 py-5">
          <div className="flex gap-3">
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-destructive" />
            <div className="flex flex-col gap-1.5">
              <span className="text-[15px] font-bold text-destructive">
                계정 삭제 (탈퇴)
              </span>
              <p className="text-[13px] leading-relaxed text-[#EF4444]">
                계정을 삭제하면 이메일 / 이름 / 비밀번호 등 식별 가능한 정보가 즉시
                마스킹되어 복구할 수 없습니다.
                <br />
                면접 기록과 사용자 정보는 탈퇴 즉시 영구적으로 삭제되며, 이 작업은
                되돌릴 수 없습니다.
              </p>
              <div>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => withdrawDialogRef.current?.showModal()}
                  className="h-10 rounded-[10px] px-5 text-sm"
                >
                  탈퇴하기
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
      </div>

      <dialog
        ref={withdrawDialogRef}
        className="w-[480px] rounded-[20px] border-none p-0 shadow-[0_20px_30px_rgba(0,0,0,0.18)] backdrop:bg-[rgba(23,25,26,0.42)]"
      >
        <div className="relative px-9 pt-9 pb-8">
          <button
            type="button"
            onClick={() => withdrawDialogRef.current?.close()}
            className="absolute top-9 right-9 text-contents-tertiary"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
          <h2 className="pr-7 text-[22px] font-bold tracking-[-0.4px] text-foreground">
            정말 계정을 삭제하시겠습니까?
          </h2>
          <div className="mt-6 flex gap-2.5 rounded-[14px] border border-[#FECACA] bg-[#FEF2F2] px-5 py-[18px]">
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-destructive" />
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-destructive">계정 삭제 (탈퇴)</span>
              <p className="text-[13px] leading-relaxed text-[#EF4444]">
                계정을 삭제하면 식별 가능한 정보 (이메일 / 이름 / 비밀번호) 가 즉시
                마스킹되어 복구할 수 없습니다. 면접 기록과 사용자 정보는 탈퇴 즉시
                영구적으로 삭제됩니다.
              </p>
            </div>
          </div>
          {withdrawStatus === "error" && (
            <div className="mt-4">
              <ErrorState message={withdrawError!} retry={submitWithdraw} />
            </div>
          )}
          <div className="mt-7 flex justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => withdrawDialogRef.current?.close()}
              className="h-10 rounded-[10px] border-[#E8EAF0] px-5 text-[15px] font-semibold"
            >
              취소
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={submitWithdraw}
              disabled={withdrawStatus === "submitting"}
              className="h-10 rounded-[10px] border-none bg-destructive px-5 text-[15px] font-semibold text-primary-foreground hover:brightness-90"
            >
              탈퇴하기
            </Button>
          </div>
        </div>
      </dialog>
    </div>
  )
}
