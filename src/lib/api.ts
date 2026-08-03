import type {
  AnswerSubmitResult,
  ApplicationProfile,
  CareerLevel,
  InterviewSessionDetail,
  InterviewSessionStart,
  InterviewSessionStatus,
  InterviewSessionSummary,
  OverallFeedback,
  QuestionAudio,
  UserProfile,
} from "@/types"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1"
const ACCESS_TOKEN_KEY = "moamyeonwan_access_token"
const REFRESH_TOKEN_KEY = "moamyeonwan_refresh_token"

function readToken(key: string) {
  return localStorage.getItem(key) ?? sessionStorage.getItem(key)
}

export function getAccessToken() {
  return readToken(ACCESS_TOKEN_KEY)
}

function getRefreshToken() {
  return readToken(REFRESH_TOKEN_KEY)
}

// remember=true(자동 로그인)면 브라우저를 닫아도 유지되는 localStorage에,
// false면 탭을 닫으면 사라지는 sessionStorage에 저장한다(화면설계서 로그인 목업 기준).
export function setTokens(accessToken: string, refreshToken: string, remember = true) {
  const storage = remember ? localStorage : sessionStorage
  storage.setItem(ACCESS_TOKEN_KEY, accessToken)
  storage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export function clearToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  sessionStorage.removeItem(REFRESH_TOKEN_KEY)
}

async function parseBody<T>(res: Response): Promise<T> {
  const text = await res.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

async function rawFetch(path: string, options: RequestInit) {
  const isFormData = options.body instanceof FormData
  const accessToken = getAccessToken()
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  })
}

let reissuePromise: Promise<boolean> | null = null

// 만료된 accessToken을 refreshToken으로 한 번 재발급 시도. 이미 재발급이
// 진행 중이면 그 결과를 공유해 동시에 여러 요청이 401을 맞아도 재발급은 한 번만 한다.
function reissueAccessToken(): Promise<boolean> {
  if (!reissuePromise) {
    reissuePromise = (async () => {
      const refreshToken = getRefreshToken()
      if (!refreshToken) return false
      try {
        const res = await rawFetch("/auth/reissue", {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
        })
        if (!res.ok) return false
        const remembered = Boolean(localStorage.getItem(ACCESS_TOKEN_KEY))
        const { accessToken, refreshToken: nextRefreshToken } =
          await parseBody<{ accessToken: string; refreshToken: string }>(res)
        setTokens(accessToken, nextRefreshToken, remembered)
        return true
      } catch {
        return false
      }
    })().finally(() => {
      reissuePromise = null
    })
  }
  return reissuePromise
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res = await rawFetch(path, options)

  if (res.status === 401 && getRefreshToken()) {
    const reissued = await reissueAccessToken()
    if (reissued) {
      res = await rawFetch(path, options)
    }
  }

  if (res.status === 401) {
    clearToken()
    window.location.href = "/login"
    throw new Error("인증이 만료되었습니다. 다시 로그인해주세요.")
  }

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`)
  }
  return parseBody<T>(res)
}

export function signup(input: {
  loginId: string
  email: string
  password: string
  name: string
  privacyAgreed: boolean
}) {
  return apiFetch<void>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function login(loginId: string, password: string) {
  return apiFetch<{ accessToken: string; refreshToken: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ loginId, password }),
  })
}

export function logout() {
  return apiFetch<void>("/auth/logout", { method: "POST" }).catch(() => {})
}

export function listApplicationProfiles() {
  return apiFetch<ApplicationProfile[]>("/application-profiles")
}

export function createApplicationProfile(input: {
  companyName: string
  jobPosition: string
  careerLevel: CareerLevel
}) {
  return apiFetch<ApplicationProfile>("/application-profiles", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function updateApplicationProfile(
  id: number,
  input: { companyName: string; jobPosition: string; careerLevel: CareerLevel }
) {
  return apiFetch<ApplicationProfile>(`/application-profiles/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  })
}

export function createInterviewSession(input: {
  applicationProfileId: number
  interviewType: string
  durationMinutes: number
}) {
  return apiFetch<InterviewSessionStart>("/interviews", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function listInterviewSessions(status: InterviewSessionStatus | "ALL" = "ALL") {
  return apiFetch<InterviewSessionSummary[]>(`/interviews?status=${status}`)
}

export function deleteInterviewSession(sessionId: number) {
  return apiFetch<void>(`/interviews/${sessionId}`, { method: "DELETE" })
}

export function submitAnswer(sessionId: number, questionId: number, audio: Blob) {
  const formData = new FormData()
  formData.append("questionId", String(questionId))
  formData.append("audioFile", audio, "answer.wav")
  return apiFetch<AnswerSubmitResult>(`/interviews/${sessionId}/answers`, {
    method: "POST",
    body: formData,
  })
}

export function getQuestionAudio(sessionId: number, questionId: number) {
  return apiFetch<QuestionAudio>(
    `/interviews/${sessionId}/questions/${questionId}/audio`
  )
}

export function completeInterview(sessionId: number) {
  return apiFetch<OverallFeedback>(`/interviews/${sessionId}/complete`, {
    method: "POST",
  })
}

export function getInterviewDetail(sessionId: number) {
  return apiFetch<InterviewSessionDetail>(`/interviews/${sessionId}/detail`)
}

export function getUserProfile() {
  return apiFetch<UserProfile>("/users/me")
}

export function updateUserProfile(input: { nickname: string; desiredPosition: string }) {
  return apiFetch<UserProfile>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  })
}

export function changePassword(input: {
  currentPassword: string
  newPassword: string
  newPasswordConfirm: string
}) {
  return apiFetch<void>("/auth/password", {
    method: "PATCH",
    body: JSON.stringify(input),
  })
}

export function withdrawAccount() {
  return apiFetch<void>("/users/me", { method: "DELETE" })
}
