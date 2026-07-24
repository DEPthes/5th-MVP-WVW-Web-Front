# 모면완 프론트엔드 — 남은 작업

## 완료된 것

- 프로젝트 세팅: Vite + React 19 + TypeScript + Tailwind v4 + shadcn/ui
- 라우팅 스켈레톤: 7개 경로 (`/login`, `/signup`, `/materials/new`, `/questions`, `/record`, `/result/:answerId`, `/history`)
- `src/lib/api.ts` — fetch 래퍼(토큰 첨부, FormData 처리, 에러 핸들링) + 백엔드 엔드포인트별 함수
- `src/hooks/useMediaRecorderCapture.ts` — 카메라/마이크 녹화, `RecordPage`에 미리보기+시작/종료 버튼 연결, 언마운트 시 트랙/레코더 정리
- `src/hooks/useFaceLandmarkerMetrics.ts` + `src/lib/facialMetrics.ts` — MediaPipe로 얼굴 지표 집계(순수 로직 분리, 테스트 완료): 아이컨택 비율(eyeLook AND head pose), 분당 깜빡임(blinkRate), 호감도/긴장도/무표정도(likabilityScore/tensionScore/neutralScore, 블렌드셰이프 카테고리 평균 기반 휴리스틱)
- `src/hooks/useVoiceMetrics.ts` + `src/lib/voiceMetrics.ts` — Web Audio API로 목소리 지표 집계: 작은 목소리 구간 비율(quietRatio), 떨림 구간 비율(trembleRatio)
- `src/hooks/useFillerWordCounter.ts` + `src/lib/fillerWords.ts` — Web Speech API로 필러워드("음"/"어"/"그"/"저기"/"니까") 카운트, 미지원 브라우저는 에러 상태로 표시
- `RecordPage`/`ResultPage`에 위 얼굴·목소리 지표 전부 표시. 언마운트 시 카메라/마이크/AudioContext/SpeechRecognition 정리, 미리보기 좌우 미러링(CSS만, 실제 녹화본은 원본 유지)
- `src/lib/polling.ts` + `src/hooks/usePolling.ts` — 처리상태 폴링 유틸, `ResultPage`에 연결
- Vitest 테스트 33개 (api/facialMetrics/voiceMetrics/fillerWords/polling 순수 로직)
- 라이브러리 사용 현황 및 백엔드 전송 데이터 형태: `docs/LIBRARIES_AND_API.md` 참고

## 남은 작업

### 1. 인증 흐름
- [ ] `LoginPage` / `SignupPage` 실제 폼 구현 (shadcn Form) → `login()`/`signup()` 호출 → 토큰 저장 → 리다이렉트
- [ ] 보호된 라우트 처리 (비로그인 시 `/login`으로 리다이렉트)
- [ ] 로그아웃 동작 (토큰 삭제)
- [ ] 401 응답 시 재로그인 유도 처리

### 2. 준비자료 입력 (`MaterialInputPage`)
- [ ] 기업명 / 직무 / 준비자료 텍스트 입력 폼
- [ ] `createMaterial()` 호출, 성공 시 질문 생성 트리거 후 `/questions`로 이동
- [ ] 입력 검증 (필수값 등)

### 3. 질문 리스트 (`QuestionListPage`)
- [ ] `generateQuestions()` 결과 렌더링, 생성 대기 중 로딩 상태
- [ ] 질문별 "답변 시작" → `/record`로 이동하며 질문 컨텍스트 전달

### 4. 녹화 → 업로드 연결 (`RecordPage`)
- [ ] 현재 녹화 종료 시 얼굴·목소리 지표 결과를 화면에만 표시 — `uploadAnswer(questionId, videoBlob, facialMetrics, voiceMetrics)` 실제 호출로 연결(4번째 인자 `voiceMetrics` 추가됨)
- [ ] 업로드 성공 시 `/result/:answerId`로 이동
- [ ] 업로드 실패 시 재시도 UI (스펙 9번 에러 처리 기준)
- [ ] `questionId`를 `RecordPage`가 어디서 받을지 결정 (현재 질문 리스트→녹화 이동 시 컨텍스트 전달 로직 자체가 미구현, 3번 항목과 연결됨)

### 5. 히스토리 (`HistoryPage`)
- [ ] `listSessions()` / `getSession()` 연동
- [ ] 추이 그래프 — `recharts` 설치 필요 (아직 미설치)

### 6. 디자인 반영
- [ ] 7개 화면 전부 현재 자리표시자 수준 — 시안 나오는 대로 Tailwind/shadcn으로 실제 레이아웃 적용
- [ ] 로딩 / 에러 / 빈 상태 UI를 화면마다 통일된 패턴으로 정리

### 7. 기타
- [ ] `.env` 실제 배포용 `VITE_API_BASE_URL` 설정 (현재 `.env.example`만 존재)
- [ ] 반응형 대응 범위 논의 (모바일 지원 여부)
- [ ] 필러워드 카운트는 `SpeechRecognition`/`webkitSpeechRecognition`(Chrome/Edge 계열만 안정 지원, Firefox 미지원) 기반 — 미지원 브라우저 사용자에게 안내 문구를 더 눈에 띄게 할지 논의
- [ ] `src/lib/facialMetrics.ts`/`src/lib/voiceMetrics.ts`의 임계치(`ponytail:` 주석 표시)는 전부 자리표시자 — 실측 데이터로 튜닝 필요

## 참고
- 백엔드 계약: `src/types.ts`의 도메인 타입과 `docs/superpowers/specs/2026-07-11-interview-lab-design.md`(별도 저장소 `depth`) 기준
- 로드맵 원본: `depth` 저장소의 `docs/superpowers/plans/2026-07-11-interview-lab-roadmap.md`
