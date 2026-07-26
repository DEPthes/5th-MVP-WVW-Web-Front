import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ErrorState } from "@/components/ErrorState"
import { LoadingState } from "@/components/LoadingState"
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

const INPUT_CLASS =
  "rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm"

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

  function handlePasswordChange(field: keyof PasswordChangeValues, value: string) {
    setPasswordValues((prev) => ({ ...prev, [field]: value }))
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

  return (
    <div className="flex flex-col gap-6">
      <h1>설정</h1>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-medium">프로필 수정</h2>
          <p className="text-sm text-muted-foreground">
            지원하고자 하는 직무를 선택하고, 프로필을 설정할 수 있습니다.
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="nickname">닉네임</label>
          <input
            id="nickname"
            value={profile.nickname}
            onChange={(e) => handleProfileChange("nickname", e.target.value)}
            className={INPUT_CLASS}
          />
          {profileErrors.nickname && (
            <p className="text-sm text-destructive">{profileErrors.nickname}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="interestedJobRole">관심 직무</label>
          <input
            id="interestedJobRole"
            value={profile.interestedJobRole}
            onChange={(e) => handleProfileChange("interestedJobRole", e.target.value)}
            className={INPUT_CLASS}
          />
          {profileErrors.interestedJobRole && (
            <p className="text-sm text-destructive">{profileErrors.interestedJobRole}</p>
          )}
        </div>
        <Button
          type="button"
          onClick={handleProfileSubmit}
          disabled={profileStatus === "submitting"}
          className="self-start"
        >
          저장
        </Button>
        {profileStatus === "submitting" && <LoadingState message="저장하는 중..." />}
        {profileStatus === "saved" && (
          <p className="text-sm text-muted-foreground">저장되었습니다.</p>
        )}
        {profileStatus === "error" && (
          <ErrorState message={profileError!} retry={saveProfile} />
        )}
      </section>

      <section className="flex flex-col gap-4 border-t border-border pt-6">
        <div>
          <h2 className="text-sm font-medium">계정 관리</h2>
          <p className="text-sm text-muted-foreground">
            로그인 정보와 비밀번호 변경, 로그아웃, 탈퇴를 할 수 있습니다.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="loginInfo">로그인 정보</label>
          <input
            id="loginInfo"
            value={userId}
            readOnly
            className={`${INPUT_CLASS} text-muted-foreground`}
          />
          <p className="text-xs text-muted-foreground">
            로그인 정보는 변경할 수 없습니다. 변경이 필요하면 관리자에게 문의해주세요.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={handleLogout}
            className="self-start"
          >
            로그아웃
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">비밀번호 변경</span>
          <div className="flex flex-col gap-1">
            <label htmlFor="currentPassword">현재 비밀번호</label>
            <input
              id="currentPassword"
              type="password"
              value={passwordValues.currentPassword}
              onChange={(e) => handlePasswordChange("currentPassword", e.target.value)}
              className={INPUT_CLASS}
            />
            {passwordErrors.currentPassword && (
              <p className="text-sm text-destructive">{passwordErrors.currentPassword}</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="newPassword">새 비밀번호</label>
            <input
              id="newPassword"
              type="password"
              value={passwordValues.newPassword}
              onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
              className={INPUT_CLASS}
            />
            {passwordErrors.newPassword && (
              <p className="text-sm text-destructive">{passwordErrors.newPassword}</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="confirmPassword">새 비밀번호 확인</label>
            <input
              id="confirmPassword"
              type="password"
              value={passwordValues.confirmPassword}
              onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
              className={INPUT_CLASS}
            />
            {passwordErrors.confirmPassword && (
              <p className="text-sm text-destructive">{passwordErrors.confirmPassword}</p>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handlePasswordSubmit}
            disabled={
              passwordStatus === "submitting" ||
              !passwordValues.currentPassword ||
              !passwordValues.newPassword ||
              !passwordValues.confirmPassword
            }
            className="self-start"
          >
            비밀번호 변경
          </Button>
          {passwordStatus === "submitting" && <LoadingState message="변경하는 중..." />}
          {passwordStatus === "done" && (
            <p className="text-sm text-muted-foreground">비밀번호가 변경되었습니다.</p>
          )}
          {passwordStatus === "error" && (
            <ErrorState message={passwordError!} retry={submitPasswordChange} />
          )}
        </div>

        <Button
          type="button"
          variant="destructive"
          onClick={() => withdrawDialogRef.current?.showModal()}
          className="self-start"
        >
          탈퇴하기
        </Button>
      </section>

      <dialog
        ref={withdrawDialogRef}
        className="rounded-lg border border-border p-4 backdrop:bg-black/50"
      >
        <h2 className="text-sm font-medium">정말 계정을 삭제하시겠습니까?</h2>
        <p className="mt-2 max-w-sm text-sm text-destructive">
          계정을 삭제하면 식별 가능한 정보(이메일/이름/비밀번호)가 즉시 마스킹되어 복구할
          수 없습니다. 면접 기록과 사용자 정보는 탈퇴 즉시 파기됩니다.
        </p>
        {withdrawStatus === "error" && (
          <div className="mt-2">
            <ErrorState message={withdrawError!} retry={submitWithdraw} />
          </div>
        )}
        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => withdrawDialogRef.current?.close()}
          >
            취소
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={submitWithdraw}
            disabled={withdrawStatus === "submitting"}
          >
            탈퇴하기
          </Button>
        </div>
      </dialog>
    </div>
  )
}
