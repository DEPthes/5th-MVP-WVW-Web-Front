import {
  useRef,
  useState,
  type FormEvent,
  type SelectHTMLAttributes,
} from "react"
import { Link, useNavigate } from "react-router-dom"
import { ChevronDown, ChevronRight, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ErrorState } from "@/components/ErrorState"
import { LoadingState } from "@/components/LoadingState"
import { cn } from "@/lib/utils"
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

// 화면설계서 프로필 등록 모달 기준 경력 카테고리
const CAREER_OPTIONS = [
  "관련 경력",
  "유사 경력",
  "무경력",
  "정규직 경력",
  "계약직·프리랜서 경력",
  "인턴 및 현장실습",
]
const INTERVIEW_TYPE_OPTIONS = ["종합 면접"]
const DURATION_OPTIONS = [5, 10, 15, 20] as const

const INITIAL_VALUES: InterviewSetupValues = {
  companyName: "",
  jobRole: "",
  careerYears: CAREER_OPTIONS[0],
  interviewType: INTERVIEW_TYPE_OPTIONS[0],
  durationMinutes: 10,
}

const BASE_FIELD_CLASS =
  "w-full rounded-[12px] border border-input bg-background px-4 text-sm text-foreground placeholder:text-contents-tertiary focus:outline-none focus:ring-2 focus:ring-ring"
const FIELD_CLASS = cn(BASE_FIELD_CLASS, "h-[59px]")
const SELECT_CLASS = cn(BASE_FIELD_CLASS, "h-14 appearance-none pr-10")
const LABEL_CLASS = "text-label font-semibold text-contents-secondary"

function SectionDivider() {
  return <div className="h-px w-full bg-border" />
}

function SelectField({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...props} className={cn(SELECT_CLASS, className)} />
      <ChevronDown
        size={18}
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-contents-tertiary"
      />
    </div>
  )
}

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
      .then((setup) =>
        navigate(`/questions/${setup.id}`, {
          state: { durationMinutes: values.durationMinutes },
        })
      )
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
    <form onSubmit={handleSubmit} className="flex gap-8">
      <div className="flex flex-1 flex-col gap-8">
        <div className="flex items-center gap-1 text-sm text-contents-tertiary">
          <Link to="/" className="hover:text-contents-secondary">
            홈
          </Link>
          <ChevronRight size={13} />
          <span>AI 모의면접</span>
          <ChevronRight size={13} />
          <span className="text-contents-secondary">새 면접</span>
        </div>

        <div>
          <h1 className="text-heading font-bold text-foreground">
            면접 조건 설정
          </h1>
          <p className="mt-2 text-sm text-contents-tertiary">
            지원 정보와 조건을 확인하면 예상 질문을 준비합니다.
          </p>
        </div>

        <SectionDivider />

        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-label font-semibold text-foreground">
              지원 프로필
            </h2>
            <p className="mt-1 text-sm text-contents-tertiary">
              저장된 프로필 불러오기
            </p>
          </div>
          <SelectField
            value={selectedProfileId}
            onChange={(e) => handleSelectProfile(e.target.value)}
          >
            <option value="">새로 입력</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.jobRole} / {profile.careerYears}
              </option>
            ))}
          </SelectField>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-12"
              onClick={openEditProfileDialog}
              disabled={!selectedProfileId}
            >
              프로필 수정
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-12"
              onClick={openNewProfileDialog}
            >
              새 프로필 등록
            </Button>
          </div>
        </div>

        <SectionDivider />

        <div className="flex flex-col gap-6">
          <h2 className="text-label font-semibold text-foreground">지원 정보</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="companyName" className={LABEL_CLASS}>
                기업
              </label>
              <input
                id="companyName"
                value={values.companyName}
                onChange={(e) => handleChange("companyName", e.target.value)}
                placeholder="기업명을 입력하세요"
                className={FIELD_CLASS}
              />
              {errors.companyName && (
                <p className="text-xs text-destructive">{errors.companyName}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="jobRole" className={LABEL_CLASS}>
                직무
              </label>
              <input
                id="jobRole"
                value={values.jobRole}
                onChange={(e) => handleChange("jobRole", e.target.value)}
                placeholder="지원 직무를 입력하세요"
                className={FIELD_CLASS}
              />
              {errors.jobRole && (
                <p className="text-xs text-destructive">{errors.jobRole}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="careerYears" className={LABEL_CLASS}>
                경력
              </label>
              <SelectField
                id="careerYears"
                value={values.careerYears}
                onChange={(e) => handleChange("careerYears", e.target.value)}
              >
                {CAREER_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>
        </div>

        <SectionDivider />

        <div className="flex flex-col gap-6">
          <h2 className="text-label font-semibold text-foreground">면접 조건</h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label htmlFor="interviewType" className={LABEL_CLASS}>
                면접 유형
              </label>
              <SelectField
                id="interviewType"
                value={values.interviewType}
                onChange={(e) => handleChange("interviewType", e.target.value)}
              >
                {INTERVIEW_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </SelectField>
            </div>
            <div className="flex flex-col gap-2">
              <span className={LABEL_CLASS}>전체 면접 시간</span>
              <div className="grid grid-cols-4 gap-2">
                {DURATION_OPTIONS.map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => handleChange("durationMinutes", minutes)}
                    className={cn(
                      "h-14 rounded-[12px] border text-sm",
                      values.durationMinutes === minutes
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input text-contents-secondary"
                    )}
                  >
                    {minutes}분
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <aside className="h-fit w-[280px] shrink-0 rounded-[16px] border border-border p-6">
        <h3 className="text-label font-semibold text-foreground">설정 요약</h3>
        <div className="mt-4 h-px w-full bg-border" />
        <dl className="mt-4 flex flex-col">
          {[
            ["기업", values.companyName || "-"],
            ["직무", values.jobRole || "-"],
            ["경력", values.careerYears],
            ["유형", values.interviewType],
            ["시간", `${values.durationMinutes}분`],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between border-b border-border py-2.5 last:border-0"
            >
              <dt className="text-sm text-contents-tertiary">{label}</dt>
              <dd className="text-sm text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 h-px w-full bg-border" />
        <p className="mt-4 text-xs text-contents-tertiary">
          시작 전에 마이크 권한과 진행 방식을 확인합니다.
        </p>
        <Button
          type="submit"
          disabled={submitStatus === "submitting"}
          className="mt-4 h-[52px] w-full"
        >
          설정 확인하기
        </Button>

        {submitStatus === "submitting" && (
          <div className="mt-3">
            <LoadingState message="저장하는 중..." />
          </div>
        )}
        {submitStatus === "error" && (
          <div className="mt-3">
            <ErrorState message={submitError!} retry={submit} />
          </div>
        )}
      </aside>

      <dialog
        ref={profileDialogRef}
        className="w-[620px] rounded-[24px] border border-border p-0 shadow-[0px_2px_2px_rgba(0,0,0,0.04),0px_12px_14px_rgba(0,0,0,0.1),0px_40px_44px_rgba(0,0,0,0.18)] backdrop:bg-black/50"
      >
        <div className="p-10">
          <h2 className="text-heading font-bold tracking-[-1.6px] text-foreground">
            {profileDialogMode === "new" ? "새 프로필 등록" : "프로필 수정"}
          </h2>
          <p className="mt-2 text-sm text-contents-tertiary">
            {profileDialogMode === "new"
              ? "새 면접에 사용할 지원 프로필을 등록합니다."
              : "선택한 지원 프로필의 정보를 수정합니다."}
          </p>

          <div className="my-6 h-px w-full bg-border" />

          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="profileCompanyName"
                className="text-label font-semibold tracking-[-0.2px] text-contents-secondary"
              >
                기업
              </label>
              <input
                id="profileCompanyName"
                value={profileDraft.companyName}
                onChange={(e) =>
                  setProfileDraft((prev) => ({ ...prev, companyName: e.target.value }))
                }
                placeholder="기업을 입력해주세요."
                className="h-[59px] w-full rounded-[12px] border border-[#D1D5DB] bg-background px-4 text-sm text-foreground placeholder:text-contents-tertiary focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="profileJobRole"
                className="text-label font-semibold tracking-[-0.2px] text-contents-secondary"
              >
                지원 직무
              </label>
              <input
                id="profileJobRole"
                value={profileDraft.jobRole}
                onChange={(e) =>
                  setProfileDraft((prev) => ({ ...prev, jobRole: e.target.value }))
                }
                placeholder="지원 직무를 입력해주세요."
                className="h-[59px] w-full rounded-[12px] border border-[#D1D5DB] bg-background px-4 text-sm text-foreground placeholder:text-contents-tertiary focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="profileCareerYears"
                className="text-label font-semibold tracking-[-0.2px] text-contents-secondary"
              >
                경력
              </label>
              <div className="relative">
                <select
                  id="profileCareerYears"
                  value={profileDraft.careerYears}
                  onChange={(e) =>
                    setProfileDraft((prev) => ({ ...prev, careerYears: e.target.value }))
                  }
                  className="h-14 w-full appearance-none rounded-[12px] border border-[#D1D5DB] bg-background px-4 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {CAREER_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={18}
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-contents-tertiary"
                />
              </div>
            </div>
          </div>

          <div className="my-7 h-px w-full bg-border" />

          <div className="flex items-center gap-1.5 pb-6">
            <Info size={16} className="shrink-0 text-primary" />
            <span className="text-xs font-light text-contents-tertiary">
              기업, 지원 직무, 경력을 필수 항목입니다.
            </span>
          </div>

          {profileStatus === "error" && (
            <div className="pb-4">
              <ErrorState message={profileError!} retry={submitProfileDialog} />
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => profileDialogRef.current?.close()}
              className="h-14 flex-[2] rounded-[12px] border border-[#D1D5DB] text-label font-semibold tracking-[-0.4px] text-contents-secondary"
            >
              취소
            </button>
            <button
              type="button"
              onClick={submitProfileDialog}
              disabled={
                profileStatus === "submitting" ||
                !profileDraft.companyName.trim() ||
                !profileDraft.jobRole.trim()
              }
              className={cn(
                "h-14 flex-[3] rounded-[12px] text-label font-semibold tracking-[-0.4px] text-primary-foreground",
                profileStatus === "submitting" ||
                  !profileDraft.companyName.trim() ||
                  !profileDraft.jobRole.trim()
                  ? "bg-[#C7D8FA]"
                  : "bg-primary shadow-[0_2px_4px_rgba(53,99,233,0.22)]"
              )}
            >
              {profileDialogMode === "new" ? "프로필 등록" : "수정 내용 저장"}
            </button>
          </div>
        </div>
      </dialog>
    </form>
  )
}
