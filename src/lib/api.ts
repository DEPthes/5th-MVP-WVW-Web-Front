import type {
  AnswerRecord,
  ApplicantProfile,
  InterviewSetup,
  PracticeSession,
  PracticeSessionSummary,
  QuestionSet,
  UserProfile,
} from "@/types"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080"
const TOKEN_KEY = "moamyeonwan_token"

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY)
}

// remember=true(자동 로그인)면 브라우저를 닫아도 유지되는 localStorage에,
// false면 탭을 닫으면 사라지는 sessionStorage에 저장한다(화면설계서 로그인 목업 기준).
export function setToken(token: string, remember = true) {
  if (remember) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    sessionStorage.setItem(TOKEN_KEY, token)
  }
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const isFormData = options.body instanceof FormData

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (res.status === 401) {
    clearToken()
    window.location.href = "/login"
    throw new Error("인증이 만료되었습니다. 다시 로그인해주세요.")
  }

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`)
  }
  if (res.status === 204) {
    return undefined as T
  }
  return res.json() as Promise<T>
}

export function signup(input: {
  userId: string
  email: string
  password: string
  name: string
}) {
  return apiFetch<{ token: string }>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function login(userId: string, password: string) {
  return apiFetch<{ token: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ userId, password }),
  })
}

export function listApplicantProfiles() {
  return apiFetch<ApplicantProfile[]>("/api/profiles")
}

export function createApplicantProfile(input: {
  companyName: string
  jobRole: string
  careerYears: string
}) {
  return apiFetch<ApplicantProfile>("/api/profiles", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function updateApplicantProfile(
  id: string,
  input: { companyName: string; jobRole: string; careerYears: string }
) {
  return apiFetch<ApplicantProfile>(`/api/profiles/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  })
}

export function createInterviewSetup(input: {
  companyName: string
  jobRole: string
  careerYears: string
  interviewType: string
  durationMinutes: number
}) {
  return apiFetch<InterviewSetup>("/api/interviews", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function generateQuestions(interviewId: string) {
  return apiFetch<QuestionSet>(`/api/interviews/${interviewId}/questions`, {
    method: "POST",
  })
}

export function uploadAnswer(questionId: string, audio: Blob) {
  const formData = new FormData()
  formData.append("questionId", questionId)
  formData.append("audio", audio)
  return apiFetch<AnswerRecord>("/api/answers", {
    method: "POST",
    body: formData,
  })
}

export function getAnswer(id: string) {
  return apiFetch<AnswerRecord>(`/api/answers/${id}`)
}

export function listSessions() {
  return apiFetch<PracticeSessionSummary[]>("/api/sessions")
}

export function getSession(id: string) {
  return apiFetch<PracticeSession>(`/api/sessions/${id}`)
}

export function deleteSession(id: string) {
  return apiFetch<void>(`/api/sessions/${id}`, { method: "DELETE" })
}

export function getUserProfile() {
  return apiFetch<UserProfile>("/api/users/me")
}

export function updateUserProfile(input: {
  nickname: string
  interestedJobRole: string
}) {
  return apiFetch<UserProfile>("/api/users/me", {
    method: "PUT",
    body: JSON.stringify(input),
  })
}

export function changePassword(input: {
  currentPassword: string
  newPassword: string
}) {
  return apiFetch<void>("/api/users/me/password", {
    method: "PUT",
    body: JSON.stringify(input),
  })
}

export function withdrawAccount() {
  return apiFetch<void>("/api/users/me", { method: "DELETE" })
}
