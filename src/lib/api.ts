import type {
  AnswerRecord,
  FacialMetrics,
  PracticeSession,
  PreparationMaterial,
  QuestionSet,
  VoiceMetrics,
} from "@/types"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080"
const TOKEN_KEY = "moamyeonwan_token"

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
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

export function signup(email: string, password: string) {
  return apiFetch<{ token: string }>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
}

export function login(email: string, password: string) {
  return apiFetch<{ token: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
}

export function createMaterial(input: {
  companyName: string
  jobRole: string
  materialText: string
}) {
  return apiFetch<PreparationMaterial>("/api/materials", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function getMaterial(id: string) {
  return apiFetch<PreparationMaterial>(`/api/materials/${id}`)
}

export function generateQuestions(materialId: string) {
  return apiFetch<QuestionSet>(`/api/materials/${materialId}/questions`, {
    method: "POST",
  })
}

export function uploadAnswer(
  questionId: string,
  video: Blob,
  facialMetrics: FacialMetrics,
  voiceMetrics: VoiceMetrics
) {
  const formData = new FormData()
  formData.append("questionId", questionId)
  formData.append("video", video)
  formData.append("facialMetrics", JSON.stringify(facialMetrics))
  formData.append("voiceMetrics", JSON.stringify(voiceMetrics))
  return apiFetch<AnswerRecord>("/api/answers", {
    method: "POST",
    body: formData,
  })
}

export function getAnswer(id: string) {
  return apiFetch<AnswerRecord>(`/api/answers/${id}`)
}

export function listSessions() {
  return apiFetch<PracticeSession[]>("/api/sessions")
}

export function getSession(id: string) {
  return apiFetch<PracticeSession>(`/api/sessions/${id}`)
}
