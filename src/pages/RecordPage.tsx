import { useEffect, useRef, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { AlertTriangle, Headphones, Volume2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/Header"
import { ErrorState } from "@/components/ErrorState"
import { useAudioRecorder } from "@/hooks/useAudioRecorder"
import { completeInterview, getQuestionAudio, submitAnswer } from "@/lib/api"

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

const PREPARE_MS = 2000

// ponytail: 실제 마이크 입력을 분석하는 스펙트럼 아닌, 녹음 중임을 보여주는
// 장식용 CSS 애니메이션 바. 실시간 음량 반응 웨이브폼이 필요해지면
// AnalyserNode로 stream을 분석해 막대 높이를 계산하도록 교체한다.
function Waveform() {
  const bars = 46
  return (
    <div className="flex h-[90px] w-full items-center justify-center gap-[3px]">
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className="w-[3px] shrink-0 animate-pulse rounded-full bg-primary"
          style={{
            height: `${18 + Math.abs(Math.sin(i * 0.7)) * 60}%`,
            animationDelay: `${(i % 8) * 90}ms`,
            animationDuration: "900ms",
          }}
        />
      ))}
    </div>
  )
}

type RecordNavState = {
  questions?: { id: string; text: string }[]
  currentIndex?: number
  interviewId?: string
  durationMinutes?: number
}

// 새로고침으로 location.state가 날아가는 걸 막는 임시 완화책.
// 진행 중 세션을 서버에서 다시 조회하는 API가 아직 없어(getInterviewDetail은
// 완료된 세션 전용) 같은 탭 새로고침만 세션스토리지로 복구한다.
const RECORD_STATE_KEY = "moamyeonwan_record_state"
const INTERVIEW_STARTED_KEY = "moamyeonwan_interview_started_at"

function readStoredRecordState(): RecordNavState | null {
  try {
    const raw = sessionStorage.getItem(RECORD_STATE_KEY)
    return raw ? (JSON.parse(raw) as RecordNavState) : null
  } catch {
    return null
  }
}

function storeRecordState(state: RecordNavState) {
  sessionStorage.setItem(RECORD_STATE_KEY, JSON.stringify(state))
}

// 질문이 바뀌어도(컴포넌트 재마운트) 같은 면접의 시작 시각은 유지하고,
// 다른 interviewId면(새 면접) 새로 시작 시각을 잡는다.
function getOrInitInterviewStart(interviewId: string): number {
  try {
    const raw = sessionStorage.getItem(INTERVIEW_STARTED_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { interviewId: string; startedAt: number }
      if (parsed.interviewId === interviewId) return parsed.startedAt
    }
  } catch {
    // 손상된 값은 무시하고 새로 시작
  }
  const startedAt = Date.now()
  sessionStorage.setItem(
    INTERVIEW_STARTED_KEY,
    JSON.stringify({ interviewId, startedAt })
  )
  return startedAt
}

export function RecordPage() {
  const { questionId } = useParams<{ questionId: string }>()
  // 질문마다 같은 라우트 패턴(/record/:questionId)이라 questionId가 바뀌어도
  // React Router가 컴포넌트를 재마운트하지 않는다. key로 강제 재마운트해
  // 녹음/타이머/업로드 상태가 질문마다 깨끗하게 초기화되도록 한다.
  return <RecordPageInner key={questionId} />
}

function RecordPageInner() {
  const { status, error, audioBlob, start, stop } = useAudioRecorder()
  const { questionId } = useParams<{ questionId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { questions, currentIndex, interviewId, durationMinutes } =
    (location.state as RecordNavState | null) ?? readStoredRecordState() ?? {}

  useEffect(() => {
    if (questions && currentIndex !== undefined && interviewId) {
      storeRecordState({ questions, currentIndex, interviewId, durationMinutes })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 값이 갖춰질 때만 저장
  }, [questions, currentIndex, interviewId, durationMinutes])

  const questionText =
    currentIndex !== undefined ? questions?.[currentIndex]?.text : undefined
  const questionNumber = currentIndex !== undefined ? currentIndex + 1 : undefined

  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "error">(
    "idle"
  )
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPreparing, setIsPreparing] = useState(false)
  const [prepareFilled, setPrepareFilled] = useState(false)
  const [interviewStartedAt] = useState(() =>
    interviewId ? getOrInitInterviewStart(interviewId) : Date.now()
  )
  const [totalElapsed, setTotalElapsed] = useState(() =>
    Math.floor((Date.now() - interviewStartedAt) / 1000)
  )
  const timeUpRef = useRef(false)
  const intentRef = useRef<"finish" | "restart" | "end" | null>(null)
  const endDialogRef = useRef<HTMLDialogElement>(null)
  const questionAudioRef = useRef<HTMLAudioElement | null>(null)
  const [endStatus, setEndStatus] = useState<"idle" | "ending" | "error">("idle")
  const [endError, setEndError] = useState<string | null>(null)

  function speakQuestion() {
    if (!interviewId || !questionId) return
    // 오디오 요청 시작 시점부터 isSpeaking을 true로 잡아, 준비 effect가
    // 재생 시작 전에(요청이 늦게 오는 동안) 녹음을 먼저 시작해버리는 경쟁을 막는다.
    setIsSpeaking(true)
    getQuestionAudio(Number(interviewId), Number(questionId))
      .then(({ audioUrl }) => {
        const audio = questionAudioRef.current ?? new Audio()
        questionAudioRef.current = audio
        audio.src = audioUrl
        audio.onplay = () => setIsSpeaking(true)
        audio.onended = () => setIsSpeaking(false)
        audio.onerror = () => setIsSpeaking(false)
        void audio.play().catch(() => setIsSpeaking(false))
      })
      .catch(() => setIsSpeaking(false))
  }

  useEffect(() => {
    speakQuestion()
    return () => questionAudioRef.current?.pause()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 질문이 바뀔 때(마운트 시)만 1회 재생
  }, [questionId])

  useEffect(() => {
    if (isSpeaking || status !== "idle") return
    setIsPreparing(true)
    setPrepareFilled(false)
    const raf = requestAnimationFrame(() => setPrepareFilled(true))
    const timeout = setTimeout(() => {
      setIsPreparing(false)
      start()
    }, PREPARE_MS)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 음성 재생이 끝나면 짧은 준비 후 자동 녹음 시작
  }, [isSpeaking])

  // 전체 면접 시간: 질문이 바뀌어도(재마운트) interviewStartedAt은 유지되므로
  // 계속 누적된다. 질문별 녹음 시간과는 별개.
  useEffect(() => {
    const interval = setInterval(() => {
      setTotalElapsed(Math.floor((Date.now() - interviewStartedAt) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [interviewStartedAt])

  function autoEndInterview() {
    if (!interviewId) return
    if (status === "recording") {
      // 현재 답변도 저장하도록 stop → (audioBlob effect가) 업로드 → 종료 순으로 흘러간다.
      intentRef.current = "end"
      stop()
      return
    }
    setUploadStatus("uploading")
    setUploadError(null)
    completeInterview(Number(interviewId))
      .then((feedback) => {
        sessionStorage.removeItem(RECORD_STATE_KEY)
        navigate(`/sessions/${interviewId}/evaluation`, { state: { feedback } })
      })
      .catch((err) => {
        setUploadStatus("error")
        setUploadError(
          err instanceof Error ? err.message : "면접 결과를 생성하지 못했습니다."
        )
      })
  }

  // 전체 면접 제한 시간(durationMinutes) 도달 시 자동 종료. 이미 업로드가
  // 진행 중이면 그 결과가 자연스럽게 다음/종료로 이어지므로 건너뛴다.
  useEffect(() => {
    if (!durationMinutes || timeUpRef.current) return
    if (totalElapsed < durationMinutes * 60) return
    if (uploadStatus === "uploading") return
    timeUpRef.current = true
    autoEndInterview()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 기한에 처음 도달한 순간만 트리거
  }, [totalElapsed, durationMinutes, uploadStatus])

  function goToNextQuestionOrFinish() {
    const nextIndex = currentIndex !== undefined ? currentIndex + 1 : undefined
    const nextQuestion =
      questions && nextIndex !== undefined ? questions[nextIndex] : undefined

    if (nextQuestion) {
      navigate(`/record/${nextQuestion.id}`, {
        state: {
          questions,
          currentIndex: nextIndex,
          interviewId,
          durationMinutes,
        } satisfies RecordNavState,
      })
    } else if (interviewId) {
      completeInterview(Number(interviewId))
        .then((feedback) => {
          sessionStorage.removeItem(RECORD_STATE_KEY)
          navigate(`/sessions/${interviewId}/evaluation`, { state: { feedback } })
        })
        .catch((err) => {
          setUploadStatus("error")
          setUploadError(
            err instanceof Error ? err.message : "면접 결과를 생성하지 못했습니다."
          )
        })
    } else {
      navigate("/")
    }
  }

  // "면접 종료"를 누른 시점의 답변도 마저 저장하도록, 업로드가 끝난 뒤에야
  // completeInterview를 부른다. intentRef는 업로드+종료 처리가 모두 성공할
  // 때까지 "end"로 남아있어, 실패 후 재시도 시 같은 흐름을 다시 탄다.
  // ponytail: completeInterview만 실패하는 드문 경우 재시도가 답변을 한 번
  // 더 재전송한다(중복 제출). 서버가 같은 질문 재제출을 덮어쓴다는 전제.
  function runUpload(blob: Blob) {
    setUploadStatus("uploading")
    setUploadError(null)
    submitAnswer(Number(interviewId), Number(questionId), blob)
      .then(() => {
        if (intentRef.current === "end") {
          return completeInterview(Number(interviewId)).then((feedback) => {
            intentRef.current = null
            sessionStorage.removeItem(RECORD_STATE_KEY)
            navigate(`/sessions/${interviewId}/evaluation`, { state: { feedback } })
          })
        }
        intentRef.current = null
        goToNextQuestionOrFinish()
      })
      .catch((err) => {
        setUploadStatus("error")
        setUploadError(
          err instanceof Error ? err.message : "답변 처리에 실패했습니다."
        )
      })
  }

  useEffect(() => {
    if (!audioBlob || !intentRef.current) return
    if (intentRef.current === "restart") {
      intentRef.current = null
      start()
      return
    }
    runUpload(audioBlob)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- audioBlob 준비 시점에만 트리거
  }, [audioBlob])

  useEffect(() => {
    return () => stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 언마운트 시 1회만 정리
  }, [])

  function handleRestart() {
    intentRef.current = "restart"
    stop()
  }

  function handleFinish() {
    intentRef.current = "finish"
    stop()
  }

  function confirmEndInterview() {
    if (!interviewId) {
      endDialogRef.current?.close()
      navigate("/")
      return
    }
    if (isRecording) {
      // 녹음 중이면 stop()으로 현재 답변을 확정한 뒤, audioBlob effect가
      // intentRef === "end"를 보고 업로드 → completeInterview 순으로 이어간다.
      // 이후 진행 상황/오류는 페이지의 기존 uploadStatus 배너(재시도 포함)로 보여준다.
      intentRef.current = "end"
      endDialogRef.current?.close()
      stop()
      return
    }
    setEndStatus("ending")
    setEndError(null)
    completeInterview(Number(interviewId))
      .then((feedback) => {
        sessionStorage.removeItem(RECORD_STATE_KEY)
        endDialogRef.current?.close()
        navigate(`/sessions/${interviewId}/evaluation`, { state: { feedback } })
      })
      .catch((err) => {
        setEndStatus("error")
        setEndError(
          err instanceof Error ? err.message : "면접 결과를 생성하지 못했습니다."
        )
      })
  }

  const isRecording = status === "recording"

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        subtitle="전체 면접 시간과 현재 답변 녹음 시간은 별도로 표시됩니다."
        right={
          <Button
            variant="destructive"
            className="h-10 rounded-[10px] px-5"
            onClick={() => endDialogRef.current?.showModal()}
          >
            면접 종료
          </Button>
        }
      />

      <div className="mx-auto flex w-full max-w-[750px] flex-1 flex-col items-center justify-center gap-9 py-10">
        {uploadStatus === "uploading" ? (
          <>
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-info/80" />
              <span className="text-2xl font-semibold text-info">
                {questionNumber ? `질문 ${questionNumber} ` : ""}답변 처리중
              </span>
            </div>
            <div className="flex w-full flex-col items-center gap-12 rounded-[12px] border border-[#BAE6FD] bg-[#F0FAFF] px-7 py-10">
              <div className="h-8 w-full overflow-hidden rounded-full bg-[#DBE9F3]">
                <div className="h-8 w-2/3 animate-pulse rounded-full bg-primary" />
              </div>
              <div className="flex flex-col items-center gap-3 text-center">
                <p className="text-label font-bold text-info">
                  답변을 텍스트로 변환하고 있습니다.
                </p>
                <p className="text-sm text-[#7DD3FC]">
                  변환이 완료되면 다음 질문으로 이동합니다.
                </p>
              </div>
            </div>
          </>
        ) : isPreparing ? (
          <>
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-info/80" />
              <span className="text-2xl font-semibold text-info">
                {questionNumber ? `질문 ${questionNumber} ` : ""}녹음 준비
              </span>
            </div>
            <div className="flex w-full flex-col items-center gap-12 rounded-[12px] border border-[#BAE6FD] bg-[#F0FAFF] px-7 py-10">
              <div className="h-8 w-full overflow-hidden rounded-full bg-[#DBE9F3]">
                <div
                  className="h-8 rounded-full bg-primary transition-[width] ease-linear"
                  style={{
                    width: prepareFilled ? "100%" : "0%",
                    transitionDuration: `${PREPARE_MS}ms`,
                  }}
                />
              </div>
              <div className="flex flex-col items-center gap-3 text-center">
                <p className="text-label font-bold text-info">
                  잠시 후 답변 녹음이 자동으로 시작합니다.
                </p>
                <p className="text-sm text-[#7DD3FC]">답변을 준비해 주세요.</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-secondary" />
              <span className="text-2xl font-semibold text-primary">
                {questionNumber ? `질문 ${questionNumber} ` : ""}
                {isSpeaking ? "음성 재생 중" : "답변 녹음 중"}
              </span>
            </div>

            <div className="flex w-full flex-col items-center gap-7 rounded-[16px] border border-[#E8EAF0] bg-card px-9 pb-7 pt-10 shadow-[0_4px_6px_rgba(0,0,0,0.06)]">
              <div className="flex flex-col items-center gap-5 border-b border-border pb-5 text-center">
                {isRecording ? (
                  <Waveform />
                ) : (
                  <p className="text-2xl font-semibold text-foreground">
                    {questionText ?? "질문 정보를 불러올 수 없습니다."}
                  </p>
                )}
              </div>
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                  {isSpeaking ? (
                    <Volume2 size={24} className="text-primary" />
                  ) : (
                    <span
                      className={
                        isRecording
                          ? "size-3 animate-pulse rounded-full bg-destructive"
                          : "size-3 rounded-full bg-contents-tertiary"
                      }
                    />
                  )}
                  <span className="text-base text-[#757575]">
                    {isSpeaking ? "질문 음성 재생 중" : "답변 녹음 중"}
                  </span>
                </div>
                <Button
                  variant="outline"
                  className="h-10 gap-1 rounded-[10px] border-secondary px-5 text-primary"
                  onClick={speakQuestion}
                >
                  <Headphones size={16} />
                  질문 다시 듣기
                </Button>
              </div>
            </div>
          </>
        )}

        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center justify-center gap-4">
            <span className="text-base font-medium text-contents-secondary">
              전체 면접 시간
            </span>
            <span className="text-[32px] font-bold tracking-[0.48px] text-foreground">
              {formatElapsed(totalElapsed)}
            </span>
          </div>
          <p className="text-sm text-contents-tertiary">
            답변을 마치면 아래 버튼을 선택하세요.
          </p>
        </div>

        <div className="flex w-full justify-center gap-9">
          <Button
            variant="outline"
            className="h-[54px] w-full max-w-[440px] rounded-[10px] border-secondary text-primary"
            onClick={handleRestart}
            disabled={!isRecording || uploadStatus === "uploading"}
          >
            녹음 다시 시작
          </Button>
          <Button
            className="h-[54px] w-full max-w-[440px] text-[15px]"
            onClick={handleFinish}
            disabled={!isRecording || uploadStatus === "uploading"}
          >
            답변 완료하기
          </Button>
        </div>

        {status === "error" && <ErrorState message={error!} />}
        {uploadStatus === "error" && (
          <ErrorState
            message={uploadError!}
            retry={() => {
              if (audioBlob) runUpload(audioBlob)
              else if (timeUpRef.current) autoEndInterview()
            }}
          />
        )}
      </div>

      <dialog
        ref={endDialogRef}
        className="w-[440px] rounded-[16px] border border-border p-6 backdrop:bg-black/50"
      >
        <p className="text-[22px] font-bold text-foreground">면접을 종료할까요?</p>
        <div className="mt-2 flex flex-col gap-1 text-sm text-contents-secondary">
          <p>현재 녹음을 종료하고 답변을 텍스트로 변환합니다.</p>
          <p>지금까지 저장된 답변만 분석됩니다.</p>
        </div>
        <div className="mt-3 flex items-start gap-2.5 rounded-[14px] border border-warning/30 bg-warning/6 px-5 py-[18px]">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warning" />
          <p className="text-sm font-bold text-warning">
            종료 후 다시 면접을 이어서 진행할 수 없습니다.
          </p>
        </div>
        {endStatus === "error" && (
          <div className="mt-3">
            <ErrorState message={endError!} retry={confirmEndInterview} />
          </div>
        )}
        <div className="mt-7 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-[10px] text-[15px] font-semibold"
            onClick={() => endDialogRef.current?.close()}
            disabled={endStatus === "ending"}
          >
            계속 진행하기
          </Button>
          <Button
            type="button"
            className="h-10 rounded-[10px] text-[15px] font-semibold"
            onClick={confirmEndInterview}
            disabled={endStatus === "ending"}
          >
            면접 종료하기
          </Button>
        </div>
      </dialog>
    </div>
  )
}
