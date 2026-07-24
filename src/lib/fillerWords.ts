// ponytail: 기본 한국어 필러워드 세트, 실측 STT 출력으로 튜닝 필요한 자리표시자
export const FILLER_WORDS = ["음", "어", "그", "저기", "니까"]

// ponytail: 공백 기준 토큰 완전 일치만 검사 — 조사/어미가 붙은 변형은 못 잡음.
// 실측 STT 출력을 보고 형태소 분석 필요 여부 판단.
export function countFillerWords(transcript: string): number {
  const tokens = transcript.split(/\s+/).filter(Boolean)
  return tokens.filter((token) => FILLER_WORDS.includes(token)).length
}
