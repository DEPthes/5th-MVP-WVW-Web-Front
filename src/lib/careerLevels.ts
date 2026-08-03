import type { CareerLevel } from "@/types"

// ponytail: SHALLOW_EXPERIENCE는 화면설계서 드롭다운에 없던 값이라 임의로
// 라벨링함 — 실제 문구가 정해지면 교체.
export const CAREER_LEVEL_LABELS: Record<CareerLevel, string> = {
  NEWCOMER: "무경력",
  RELATED_EXPERIENCE: "관련 경력",
  SIMILAR_EXPERIENCE: "유사 경력",
  SHALLOW_EXPERIENCE: "낮은 연관 경력",
  FULL_TIME: "정규직 경력",
  CONTRACT_FREELANCE: "계약직·프리랜서 경력",
  INTERNSHIP: "인턴 및 현장실습",
}

export const CAREER_LEVEL_OPTIONS = Object.keys(CAREER_LEVEL_LABELS) as CareerLevel[]
