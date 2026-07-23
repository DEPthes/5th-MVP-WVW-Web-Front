# 음성 분석 (그룹 B) 설계

## 배경
그룹 A(얼굴 지표 확장)와 별개로, 답변 녹화 중 마이크 오디오를 분석해 다음 지표를 추가한다:
1. 필러워드("음", "어", "그", "저기", "니까") 카운트 — Web Speech API
2. 작은 목소리 구간 비율, 목소리 떨림 구간 비율 — Web Audio API

두 API는 서로 무관한 브라우저 기능이라 별도 훅으로 분리한다.

## 데이터 흐름
`useMediaRecorderCapture`가 이미 `getUserMedia({ video: true, audio: true })`로 잡은 스트림을
반환값에 노출(`stream: MediaStream | null` 추가) → `useVoiceMetrics.start(stream)`이 같은 오디오
트랙으로 `AudioContext`/`AnalyserNode`를 붙임(마이크 재요청 없음).
`useFillerWordCounter`는 독립적으로 `SpeechRecognition`을 시작(브라우저가 자체적으로 마이크 재확보,
권한은 이미 허용된 상태라 추가 프롬프트 없음).
녹화 종료 시 두 훅 모두 `stop()`으로 집계된 결과를 반환 → `VoiceMetrics`로 합쳐 업로드.

## 데이터 모델
```ts
// types.ts
export interface VoiceMetrics {
  fillerWordCount: number
  quietRatio: number    // 작은 목소리 구간 비율 (0~1), RMS 임계치 기반
  trembleRatio: number  // 떨림 구간 비율 (0~1), 피치 변동성 임계치 기반
}

export interface AnswerRecord {
  // 기존 필드...
  voiceMetrics: VoiceMetrics
}
```

`uploadAnswer` 시그니처 확장:
```ts
uploadAnswer(questionId: string, video: Blob, facialMetrics: FacialMetrics, voiceMetrics: VoiceMetrics)
```
FormData에 `voiceMetrics` 필드를 `JSON.stringify`로 추가(기존 `facialMetrics`와 동일 패턴).

## 판정 로직

- **필러워드**: `SpeechRecognition`(`webkitSpeechRecognition` 폴백 포함, `lang: "ko-KR"`,
  `continuous: true`, `interimResults: false`)을 녹화 시작과 함께 시작. `onresult`의 각 final
  transcript 조각에서 기본 필러워드 세트(`["음", "어", "그", "저기", "니까"]`, ponytail: 실측
  데이터로 튜닝 필요한 자리표시자)와 단어 경계 매칭해 누적 카운트.
- **볼륨(quietRatio)**: `AnalyserNode.getFloatTimeDomainData`로 프레임마다 RMS 계산 →
  임계치(ponytail: 자리표시자, 실측 튜닝 필요) 미만이면 "작은 목소리" 프레임으로 표시 →
  전체 프레임 대비 비율.
- **피치(trembleRatio)**: 같은 time-domain 버퍼에 autocorrelation으로 기본주파수(Hz) 추정 →
  슬라이딩 윈도우 내 피치 표준편차가 임계치(ponytail: 자리표시자)를 넘으면 "떨림" 프레임으로 표시 →
  전체 프레임 대비 비율.
- 두 지표 모두 `facialMetrics.ts`의 `extractSample`/`summarizeSamples` 패턴을 그대로 따름
  (프레임별 판정 → 종료 시 비율 집계).

## 컴포넌트별 변경

- `src/lib/voiceMetrics.ts` (신규): RMS 계산, autocorrelation 피치 추정, 프레임 판정, 집계 —
  순수 함수.
- `src/hooks/useFillerWordCounter.ts` (신규): SpeechRecognition 래핑. `start()`/`stop(): { fillerWordCount, error }`.
  API 미지원 시(`window.SpeechRecognition`/`webkitSpeechRecognition` 없음) `error` 상태로 노출하고
  `fillerWordCount: 0` 반환 — 녹화 자체는 막지 않음.
- `src/hooks/useVoiceMetrics.ts` (신규): AudioContext/AnalyserNode 래핑. `start(stream: MediaStream)`/
  `stop(): { quietRatio, trembleRatio }`.
- `src/hooks/useMediaRecorderCapture.ts`: 반환값에 `stream: MediaStream | null` 추가(1줄, 기존
  `streamRef.current`를 상태로도 노출).
- `src/pages/RecordPage.tsx`, `src/pages/ResultPage.tsx`: 필러워드 횟수·quietRatio·trembleRatio
  텍스트 표시, `useFillerWordCounter`의 미지원 에러 메시지 표시(기존 `faceMetrics.error`와 동일 위치).
- `src/lib/api.ts`: `uploadAnswer`에 `voiceMetrics` 파라미터 추가.

## 에러 처리
- SpeechRecognition 미지원/권한 거부: 기존 `useFaceLandmarkerMetrics`의 `error` 상태 패턴 재사용,
  선택적 기능이므로 녹화 흐름을 막지 않음.
- AudioContext/AnalyserNode: 대상 브라우저(Chrome/Edge/Safari) 표준 지원이라 별도 미지원 처리 불필요.

## 테스트
`voiceMetrics.ts` 순수 함수에 대해 mock 오디오 버퍼(사인파 등 합성 신호)로 RMS·피치 추정값,
quiet/tremble 임계치 판정 케이스를 assert 기반으로 추가.

## 백엔드 계약 노트 (범위 밖)
`voiceMetrics` 필드가 `POST /api/answers` 페이로드와 `AnswerRecord`에 추가됨 — 그룹 A와 마찬가지로
백엔드가 새 필드를 저장/무시할 수 있는지 별도 조율 필요.

## 스코프
그룹 A(얼굴 지표 확장)는 별도 스펙(`2026-07-23-facial-metrics-extension-design.md`)에서 다룸 —
이 문서는 그룹 B(음성 분석)만 다룬다.
