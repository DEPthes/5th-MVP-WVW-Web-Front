import { useEffect, useRef, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { Headphones, Volume2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/Header"
import { ErrorState } from "@/components/ErrorState"
import { useAudioRecorder } from "@/hooks/useAudioRecorder"
import { uploadAnswer } from "@/lib/api"

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

type RecordNavState = {
  questions?: { id: string; text: string }[]
  currentIndex?: number
  interviewId?: string
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
  const { questions, currentIndex, interviewId } =
    (location.state as RecordNavState | null) ?? {}

  const questionText =
    currentIndex !== undefined ? questions?.[currentIndex]?.text : undefined
  const questionNumber = currentIndex !== undefined ? currentIndex + 1 : undefined

  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "error">(
    "idle"
  )
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const intentRef = useRef<"finish" | "restart" | null>(null)
  const endDialogRef = useRef<HTMLDialogElement>(null)

  function speakQuestion() {
    if (!questionText || !("speechSynthesis" in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(questionText)
    utterance.lang = "ko-KR"
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }

  useEffect(() => {
    speakQuestion()
    return () => window.speechSynthesis?.cancel()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 질문이 바뀔 때(마운트 시)만 1회 재생
  }, [questionText])

  useEffect(() => {
    if (isSpeaking) return
    if (status === "idle") start()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 음성 재생이 끝나면 자동 녹음 시작
  }, [isSpeaking])

  useEffect(() => {
    if (status !== "recording") return
    const startedAt = Date.now()
    setElapsed(0)
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [status])

  function goToNextQuestionOrFinish() {
    const nextIndex = currentIndex !== undefined ? currentIndex + 1 : undefined
    const nextQuestion =
      questions && nextIndex !== undefined ? questions[nextIndex] : undefined

    if (nextQuestion) {
      navigate(`/record/${nextQuestion.id}`, {
        state: { questions, currentIndex: nextIndex, interviewId } satisfies RecordNavState,
      })
    } else if (interviewId) {
      navigate(`/sessions/${interviewId}/evaluation`)
    } else {
      navigate("/")
    }
  }

  function runUpload(blob: Blob) {
    setUploadStatus("uploading")
    setUploadError(null)
    uploadAnswer(questionId!, blob)
      .then(() => {
        goToNextQuestionOrFinish()
      })
      .catch((err) => {
        setUploadStatus("error")
        setUploadError(err instanceof Error ? err.message : "업로드에 실패했습니다.")
      })
  }

  useEffect(() => {
    if (!audioBlob || !intentRef.current) return
    if (intentRef.current === "finish") {
      runUpload(audioBlob)
    } else {
      start()
    }
    intentRef.current = null
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
    endDialogRef.current?.close()
    navigate("/")
  }

  const isRecording = status === "recording"

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        subtitle="전체 면접 시간과 현재 답변 녹음 시간은 별도로 표시됩니다."
        right={
          <Button
            variant="destructive"
            size="sm"
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
                <p className="text-2xl font-semibold text-foreground">
                  {questionText ?? "질문 정보를 불러올 수 없습니다."}
                </p>
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
                <Button variant="outline" size="sm" onClick={speakQuestion}>
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
              {formatElapsed(elapsed)}
            </span>
          </div>
          <p className="text-sm text-contents-tertiary">
            답변을 마치면 아래 버튼을 선택하세요.
          </p>
        </div>

        <div className="flex w-full justify-center gap-9">
          <Button
            variant="outline"
            className="h-[54px] w-full max-w-[440px]"
            onClick={handleRestart}
            disabled={!isRecording || uploadStatus === "uploading"}
          >
            녹음 다시 시작
          </Button>
          <Button
            className="h-[54px] w-full max-w-[440px] text-label"
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
            }}
          />
        )}
      </div>

      <dialog
        ref={endDialogRef}
        className="rounded-lg border border-border p-4 backdrop:bg-black/50"
      >
        <p className="text-sm font-medium">정말 면접을 종료하시겠습니까?</p>
        <p className="mt-1 text-xs text-muted-foreground">
          지금까지의 답변은 저장되지만, 남은 질문은 답변할 수 없습니다.
        </p>
        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => endDialogRef.current?.close()}
          >
            취소
          </Button>
          <Button type="button" variant="destructive" onClick={confirmEndInterview}>
            면접 종료
          </Button>
        </div>
      </dialog>
    </div>
  )
}
