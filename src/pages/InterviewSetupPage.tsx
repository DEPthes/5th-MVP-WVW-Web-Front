import { useRef, useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ErrorState } from "@/components/ErrorState"
import { LoadingState } from "@/components/LoadingState"
import {
  createApplicantProfile,
  createInterviewSetup,
  updateApplicantProfile,
} from "@/lib/api"
import {
  validateInterviewSetup,
  type InterviewSetupErrors,
  type InterviewSetupValues,
} from "@/lib/interviewSetupValidation"
import type { ApplicantProfile } from "@/types"

const CAREER_OPTIONS = ["신입", "1~3년", "4~6년", "7년 이상"]
const INTERVIEW_TYPE_OPTIONS = ["종합 면접"]
const DURATION_OPTIONS = [5, 10, 15, 20] as const

const INITIAL_VALUES: InterviewSetupValues = {
  companyName: "",
  jobRole: "",
  careerYears: CAREER_OPTIONS[0],
  interviewType: INTERVIEW_TYPE_OPTIONS[0],
  durationMinutes: 10,
}

const INPUT_CLASS =
  "rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm"

export function InterviewSetupPage() {
  const navigate = useNavigate()
  const [values, setValues] = useState<InterviewSetupValues>(INITIAL_VALUES)
  const [errors, setErrors] = useState<InterviewSetupErrors>({})
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "submitting" | "error"
  >("idle")
  const [submitError, setSubmitError] = useState<string | null>(null)

  // ponytail: listApplicantProfiles() API 대기 중 — 이번 세션에서 등록/수정한 프로필만 목록에 반영
  const [profiles, setProfiles] = useState<ApplicantProfile[]>([])
  const [selectedProfileId, setSelectedProfileId] = useState("")

  const profileDialogRef = useRef<HTMLDialogElement>(null)
  const [profileDialogMode, setProfileDialogMode] = useState<"new" | "edit">(
    "new"
  )
  const [profileDraft, setProfileDraft] = useState({
    companyName: "",
    jobRole: "",
    careerYears: CAREER_OPTIONS[0],
  })
  const [profileStatus, setProfileStatus] = useState<
    "idle" | "submitting" | "error"
  >("idle")
  const [profileError, setProfileError] = useState<string | null>(null)

  function handleChange<K extends keyof InterviewSetupValues>(
    field: K,
    value: InterviewSetupValues[K]
  ) {
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  function handleSelectProfile(profileId: string) {
    setSelectedProfileId(profileId)
    const profile = profiles.find((p) => p.id === profileId)
    if (profile) {
      setValues((prev) => ({
        ...prev,
        companyName: profile.companyName,
        jobRole: profile.jobRole,
        careerYears: profile.careerYears,
      }))
    }
  }

  function openNewProfileDialog() {
    setProfileDialogMode("new")
    setProfileDraft({ companyName: "", jobRole: "", careerYears: CAREER_OPTIONS[0] })
    setProfileStatus("idle")
    setProfileError(null)
    profileDialogRef.current?.showModal()
  }

  function openEditProfileDialog() {
    const profile = profiles.find((p) => p.id === selectedProfileId)
    if (!profile) return
    setProfileDialogMode("edit")
    setProfileDraft({
      companyName: profile.companyName,
      jobRole: profile.jobRole,
      careerYears: profile.careerYears,
    })
    setProfileStatus("idle")
    setProfileError(null)
    profileDialogRef.current?.showModal()
  }

  function submitProfileDialog() {
    setProfileStatus("submitting")
    setProfileError(null)
    const request =
      profileDialogMode === "new"
        ? createApplicantProfile(profileDraft)
        : updateApplicantProfile(selectedProfileId, profileDraft)
    request
      .then((profile) => {
        setProfiles((prev) => [...prev.filter((p) => p.id !== profile.id), profile])
        setSelectedProfileId(profile.id)
        setValues((prev) => ({
          ...prev,
          companyName: profile.companyName,
          jobRole: profile.jobRole,
          careerYears: profile.careerYears,
        }))
        profileDialogRef.current?.close()
      })
      .catch((err) => {
        setProfileStatus("error")
        setProfileError(
          err instanceof Error ? err.message : "프로필 저장에 실패했습니다."
        )
      })
  }

  function submit() {
    setSubmitStatus("submitting")
    setSubmitError(null)
    createInterviewSetup(values)
      .then((setup) => navigate(`/questions/${setup.id}`))
      .catch((err) => {
        setSubmitStatus("error")
        setSubmitError(err instanceof Error ? err.message : "저장에 실패했습니다.")
      })
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const nextErrors = validateInterviewSetup(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    submit()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div>
        <h1>면접 조건 설정</h1>
        <p className="text-sm text-muted-foreground">
          지원 정보와 조건을 확인하면 예상 질문을 준비합니다.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">지원 프로필</h2>
        <label htmlFor="savedProfile" className="text-sm text-muted-foreground">
          저장된 프로필 불러오기
        </label>
        <select
          id="savedProfile"
          value={selectedProfileId}
          onChange={(e) => handleSelectProfile(e.target.value)}
          className={INPUT_CLASS}
        >
          <option value="">새로 입력</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.jobRole} / {profile.careerYears}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={openEditProfileDialog}
            disabled={!selectedProfileId}
          >
            프로필 수정
          </Button>
          <Button type="button" variant="outline" onClick={openNewProfileDialog}>
            새 프로필 등록
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">지원 정보</h2>
        <div className="flex flex-col gap-1">
          <label htmlFor="companyName">기업</label>
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
          <label htmlFor="careerYears">경력</label>
          <select
            id="careerYears"
            value={values.careerYears}
            onChange={(e) => handleChange("careerYears", e.target.value)}
            className={INPUT_CLASS}
          >
            {CAREER_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">면접 조건</h2>
        <div className="flex flex-col gap-1">
          <label htmlFor="interviewType">면접 유형</label>
          <select
            id="interviewType"
            value={values.interviewType}
            onChange={(e) => handleChange("interviewType", e.target.value)}
            className={INPUT_CLASS}
          >
            {INTERVIEW_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <span>전체 면접 시간</span>
          <div className="flex gap-2">
            {DURATION_OPTIONS.map((minutes) => (
              <Button
                key={minutes}
                type="button"
                variant={values.durationMinutes === minutes ? "default" : "outline"}
                onClick={() => handleChange("durationMinutes", minutes)}
              >
                {minutes}분
              </Button>
            ))}
          </div>
        </div>
      </div>

      <Button type="submit" disabled={submitStatus === "submitting"}>
        설정 확인하기
      </Button>

      {submitStatus === "submitting" && <LoadingState message="저장하는 중..." />}
      {submitStatus === "error" && (
        <ErrorState message={submitError!} retry={submit} />
      )}

      <dialog
        ref={profileDialogRef}
        className="rounded-lg border border-border p-4 backdrop:bg-black/50"
      >
        <h2 className="text-sm font-medium">
          {profileDialogMode === "new" ? "새 지원 프로필 등록" : "지원 프로필 수정"}
        </h2>
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="profileCompanyName">기업</label>
            <input
              id="profileCompanyName"
              value={profileDraft.companyName}
              onChange={(e) =>
                setProfileDraft((prev) => ({ ...prev, companyName: e.target.value }))
              }
              className={INPUT_CLASS}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="profileJobRole">지원 직무</label>
            <input
              id="profileJobRole"
              value={profileDraft.jobRole}
              onChange={(e) =>
                setProfileDraft((prev) => ({ ...prev, jobRole: e.target.value }))
              }
              className={INPUT_CLASS}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="profileCareerYears">경력</label>
            <select
              id="profileCareerYears"
              value={profileDraft.careerYears}
              onChange={(e) =>
                setProfileDraft((prev) => ({ ...prev, careerYears: e.target.value }))
              }
              className={INPUT_CLASS}
            >
              {CAREER_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {profileStatus === "error" && (
            <ErrorState message={profileError!} retry={submitProfileDialog} />
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={submitProfileDialog}
              disabled={
                profileStatus === "submitting" ||
                !profileDraft.companyName.trim() ||
                !profileDraft.jobRole.trim()
              }
            >
              {profileDialogMode === "new" ? "등록" : "저장"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => profileDialogRef.current?.close()}
            >
              취소
            </Button>
          </div>
        </div>
      </dialog>
    </form>
  )
}
