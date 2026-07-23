# 얼굴 지표 확장 (그룹 A) 설계

## 배경
현재 `useFaceLandmarkerMetrics.ts` + `facialMetrics.ts`는 MediaPipe FaceLandmarker 블렌드셰이프로
아이컨택 비율(`eyeContactRatio`)과 표정 변화 횟수(`expressionChanges`)만 집계한다.
추가로 다음 3개 지표를 같은 파이프라인 안에서 확장한다:
1. 눈 깜빡임 빈도 (분당 횟수, 원시 수치만 노출 — 긴장도 해석은 소비 측 몫)
2. head pose 기반 응시 판정 (기존 eyeLook 블렌드셰이프와 AND 결합)
3. 표정 변화 타임라인 (1초 버킷 집계, 백엔드 전송 + ResultPage 재현)

## 데이터 흐름
`<video>` 프레임 → `landmarker.detectForVideo` (blendshapes + facialTransformationMatrixes) →
프레임별 `FrameSample{eyeContact, expressionScore, isBlinkEdge, timestampMs}` 누적 →
녹화 종료 시 `summarizeSamples`가 `FacialMetrics`로 집계 → `RecordPage`/`ResultPage`에 표시,
`uploadAnswer`로 백엔드 전송.

## 데이터 모델

```ts
// facialMetrics.ts 내부 (비공개)
interface FrameSample {
  eyeContact: boolean     // eyeLook 블렌드셰이프 AND head pose 둘 다 정상 범위일 때만 true
  expressionScore: number
  isBlinkEdge: boolean    // 이 프레임에서 눈 감김→뜸 rising edge 발생
  timestampMs: number     // performance.now() 기준
}

// types.ts (공개, 백엔드 계약 변경)
export interface FacialMetrics {
  eyeContactRatio: number
  expressionChanges: number
  blinkRate: number            // 분당 깜빡임 횟수 = (blink edge 수 / 총 지속시간초) * 60
  expressionTimeline: number[] // 1초 버킷 평균 expressionScore, 길이 = 녹화 초 단위 반올림
}
```

## 판정 로직

- **head pose**: MediaPipe 옵션에 `outputFacialTransformationMatrixes: true` 추가.
  `facialTransformationMatrixes[0]`(4x4 회전행렬)에서 yaw/pitch 각도를 계산하고,
  기존 `EYE_LOOK_THRESHOLD`처럼 각도 임계치(예: ±20도, ponytail 자리표시자, 실측 튜닝 필요)를 벗어나면 응시 아님으로 판정.
  `eyeContact = eyeLookNormal && headPoseNormal` (AND 결합).
- **blink edge**: `eyeBlinkLeft`/`eyeBlinkRight` 스코어가 임계치를 아래→위로 넘는 순간만 1회로 카운트
  (프레임마다 감은 상태를 카운트하면 fps에 따라 값이 부풀려짐). `blinkRate`는 프레임 수가 아닌
  실제 경과 시간(첫/마지막 timestampMs 차이)으로 정규화.
- **timeline**: `timestampMs`를 1초 단위로 버킷팅해 각 버킷의 `expressionScore` 평균을 배열로 반환.
  프레임레이트(fps)와 무관하게 배열 길이가 녹화 시간(초)에 고정되므로 페이로드 크기가 예측 가능.

## 컴포넌트별 변경

- `src/lib/facialMetrics.ts`: blink edge 감지, head pose 각도 계산, 1초 버킷 다운샘플링 로직 추가.
  순수 함수 유지 — 기존 유닛테스트 파일에 케이스 추가.
- `src/hooks/useFaceLandmarkerMetrics.ts`: `outputFacialTransformationMatrixes: true` 옵션 추가,
  프레임마다 `result.facialTransformationMatrixes`를 `extractSample`에 함께 전달.
- `src/pages/RecordPage.tsx`, `src/pages/ResultPage.tsx`: `blinkRate` 텍스트 한 줄 추가,
  `expressionTimeline`을 인라인 SVG `<polyline>` 스파크라인으로 렌더링
  (ponytail: 데이터 포인트가 수십 개 수준이라 차트 라이브러리 도입 불필요).

## 에러 처리
기존 에러 처리 경로 재사용(모델 로드 실패, 얼굴 미검출). head pose를 못 구한 프레임은
`eyeContact=false`로 보수적으로 처리(응시 안 함으로 간주).

## 테스트
`facialMetrics.ts`가 순수 로직이므로 mock blendshape/matrix 입력에 대해:
- blink edge 카운팅이 rising edge만 잡는지
- timeline 버킷 개수와 평균값이 예상과 맞는지
- head pose AND 결합이 두 조건 중 하나만 벗어나도 false가 되는지
assert 기반 케이스를 기존 테스트 파일에 추가.

## 백엔드 계약 노트 (범위 밖)
`FacialMetrics`에 `blinkRate`, `expressionTimeline` 필드가 추가되어 `POST /api/answers` 페이로드가
커진다. 이 스펙은 프론트 전용이며, 백엔드가 새 필드를 저장/무시할 수 있는지는 별도 조율 필요.

## 스코프
그룹 B(Web Speech API 필러워드, Web Audio API 볼륨/피치)는 별도 스펙으로 분리 — 이 문서는 그룹 A만 다룬다.
