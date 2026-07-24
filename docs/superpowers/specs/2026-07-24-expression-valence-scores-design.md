# 표정 점수를 호감도/긴장도/무표정도로 교체 — 설계

## 배경
`src/lib/facialMetrics.ts`는 현재 `mouthSmileLeft/Right`, `browInnerUp`, `jawOpen` 4개 블렌드셰이프를 더한
`expressionScore`로 "표정이 변했는지"만 판단(`expressionChanges` 횟수, `expressionTimeline` 1초 버킷 그래프)한다.
이를 "어떤 종류의 표정인지"를 보는 3개의 독립적인 0~1 점수(호감도/긴장도/무표정도)로 교체한다.
`eyeContactRatio`(head pose 포함)와 `blinkRate`는 이번 변경과 무관하게 그대로 유지한다.

## 카테고리 구성
MediaPipe FaceLandmarker의 52개 블렌드셰이프 중 다음을 사용한다:

```ts
const LIKABILITY_CATEGORIES = [ // 호감도
  "mouthSmileLeft", "mouthSmileRight", "cheekSquintLeft", "cheekSquintRight",
  "browOuterUpLeft", "browOuterUpRight", "browInnerUp",
]
const TENSION_CATEGORIES = [ // 긴장도
  "mouthPressLeft", "mouthPressRight", "mouthRollUpper", "mouthRollLower",
  "browDownLeft", "browDownRight", "eyeSquintLeft", "eyeSquintRight",
  "mouthShrugUpper", "mouthShrugLower",
]
const NEUTRAL_CATEGORIES = ["_neutral"] // 무표정도
```

## 점수 계산

- **프레임별**: 각 카테고리에 속한 블렌드셰이프 점수(0~1)의 **평균**을 그 프레임의 카테고리 점수로 삼는다.
  예: 호감도 = (mouthSmileLeft + mouthSmileRight + cheekSquintLeft + cheekSquintRight + browOuterUpLeft +
  browOuterUpRight + browInnerUp) / 7. 카테고리 하나가 1개짜리(`무표정도`)면 그 값 자체가 프레임 점수.
- **녹화 전체**: 각 프레임의 카테고리 점수를 녹화 전체 프레임 수로 다시 평균 — `summarizeSamples`가 반환하는
  최종 `likabilityScore`/`tensionScore`/`neutralScore`(모두 0~1).
- 세 점수는 서로 배타적이지 않다(한 프레임이 호감도·긴장도 둘 다 높을 수 있음 — 예: 어색한 미소).
  이는 의도된 설계이며, 감정을 정확히 인식하는 것이 아니라 근육 움직임 기반의 휴리스틱 추정치임을 인지한다.

## 데이터 모델

```ts
// facialMetrics.ts 내부(비공개) — expressionScore 필드를 3개로 교체
interface FrameSample {
  eyeContact: boolean
  likabilityScore: number
  tensionScore: number
  neutralScore: number
  blinkScore: number
  timestampMs: number
}

// types.ts (공개, 백엔드 계약 변경) — expressionChanges/expressionTimeline 제거, 3개 필드 추가
export interface FacialMetrics {
  eyeContactRatio: number
  blinkRate: number
  likabilityScore: number
  tensionScore: number
  neutralScore: number
}
```

## 컴포넌트별 변경

- `src/lib/facialMetrics.ts`: `EXPRESSION_CATEGORIES`, `EXPRESSION_DELTA_THRESHOLD`, 표정 변화 카운팅
  로직, 1초 버킷팅 로직을 전부 삭제. 위 3개 카테고리 상수와 카테고리 평균 계산 함수를 추가.
  `extractSample(categories, timestampMs?, matrices?)`/`summarizeSamples(samples)` 시그니처는 유지하고
  내부 계산만 교체한다.
- `src/lib/facialMetrics.test.ts`: `expressionScore`/`expressionChanges`/`expressionTimeline` 관련 테스트를
  전부 제거하고, 카테고리 평균 계산 및 녹화 전체 평균 집계에 대한 새 테스트로 교체.
- `src/types.ts`: `FacialMetrics` 필드를 위 데이터 모델대로 교체.
- `src/lib/api.test.ts`: `uploadAnswer` 테스트 호출의 `facialMetrics` 리터럴을 새 필드에 맞게 갱신.
- `src/pages/RecordPage.tsx`, `src/pages/ResultPage.tsx`: 기존 "표정 변화 횟수 · `ExpressionSparkline`"
  표시를 "호감도 X% · 긴장도 Y% · 무표정도 Z%" 텍스트로 교체.
- `src/components/ExpressionSparkline.tsx`: 사용처가 사라지므로 파일 삭제.
- `src/hooks/useFaceLandmarkerMetrics.ts`: 변경 없음 — `extractSample` 시그니처가 유지되므로 호출부 수정 불필요.

## 에러 처리
기존과 동일 — 블렌드셰이프 카테고리가 없으면(`scoreOf`가 0 반환) 해당 프레임 점수는 0으로 처리되어
전체 평균을 낮추는 방향으로만 작용, 별도 예외 처리 불필요.

## 테스트
`facialMetrics.ts`가 순수 로직이므로 mock 블렌드셰이프 입력에 대해:
- 카테고리별 평균 계산이 정확한지(예: 호감도 카테고리 중 일부만 점수가 있을 때 평균이 맞는지)
- 녹화 전체 평균이 프레임별 점수를 올바르게 집계하는지
- 무표정도(`_neutral`, 카테고리 1개)가 그 값 자체로 나오는지
- 샘플이 0개일 때 세 점수 모두 0을 반환하는지
assert 기반 케이스로 검증한다. 기존 `eyeContactRatio`/`blinkRate`/head pose 테스트는 회귀 없이 유지되어야 한다.

## 백엔드 계약 노트 (범위 밖)
`FacialMetrics`에서 `expressionChanges`/`expressionTimeline` 필드가 사라지고 `likabilityScore`/
`tensionScore`/`neutralScore`가 추가되는 breaking 변경. `uploadAnswer`는 현재 앱 어디서도 호출되지
않는 상태(`docs/TODO.md` 4번 항목)라 실질적인 백엔드 영향은 없다.

## 스코프
`eyeContactRatio`(head pose 결합 포함)와 `blinkRate` 계산 로직은 이번 변경과 무관하며 그대로 유지한다.
