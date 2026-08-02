import { useEffect, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { CheckCircle2, Mic, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/Header"
import { cn } from "@/lib/utils"

type MicStatus = "checking" | "granted" | "denied"

const CHECKLIST = [
  {
    title: "조용한 환경을 확인하세요.",
    description: "이어폰을 사용하면 질문을 더 선명하게 들을 수 있습니다.",
  },
  {
    title: "답변 전 짧은 안내 후 자동으로 녹음됩니다.",
    description: "필요하면 질문을 다시 듣거나 녹음을 다시 시작할 수 있습니다.",
  },
  {
    title: "원본 음성은 변환 후 삭제됩니다.",
    description: "변환된 텍스트만 답변 분석에 사용됩니다.",
  },
]

// ponytail: 화면설계서(Slide 14/15)엔 "N분 동안 O 면접을 진행합니다" 헤더가 있으나
// 이 라우트(/record/:questionId/start)엔 interviewId가 없어 면접 시간·유형을 조회할
// 수 없다. 라우팅에 interviewId를 실어 나르게 되면 그때 추가.
export function InterviewStartPage() {
  const { questionId } = useParams<{ questionId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const navState = location.state as {
    questions?: { id: string; text: string }[]
    currentIndex?: number
    interviewId?: string
    durationMinutes?: number
  } | null
  const [micStatus, setMicStatus] = useState<MicStatus>("checking")

  async function checkMicPermission() {
    setMicStatus("checking")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())
      setMicStatus("granted")
    } catch {
      setMicStatus("denied")
    }
  }

  useEffect(() => {
    checkMicPermission()
  }, [])

  const isDenied = micStatus === "denied"

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="시작 전 확인" />

      <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col justify-center py-10">
        <h1 className="text-heading font-bold text-foreground">면접을 진행합니다.</h1>
        <p className="mt-3 text-sm text-contents-tertiary">
          질문은 음성으로 재생되며 답변은 녹음 후 텍스트로 변환됩니다.
        </p>

        <ul className="mt-8 flex flex-col">
          {CHECKLIST.map((item, index) => (
            <li
              key={item.title}
              className={cn(
                "flex items-start gap-4 py-5",
                index < CHECKLIST.length - 1 && "border-b border-border"
              )}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-positive/10">
                <CheckCircle2 size={14} className="text-positive" />
              </span>
              <div>
                <p className="text-label font-semibold text-foreground">
                  {item.title}
                </p>
                <p className="mt-1 text-sm text-contents-tertiary">
                  {item.description}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <div
          className={cn(
            "mt-7 flex items-center justify-between rounded-[12px] border p-5",
            isDenied
              ? "border-destructive/30 bg-destructive/4"
              : "border-positive/30 bg-positive/4"
          )}
        >
          <div className="flex items-center gap-3.5">
            <span
              className={cn(
                "flex size-9 items-center justify-center rounded-[10px]",
                isDenied ? "bg-destructive/12" : "bg-positive/12"
              )}
            >
              {isDenied ? (
                <XCircle size={18} className="text-destructive" />
              ) : (
                <Mic size={18} className="text-positive" />
              )}
            </span>
            <div>
              <p className="text-label font-semibold text-foreground">
                {micStatus === "granted"
                  ? "마이크를 사용할 수 있습니다."
                  : micStatus === "denied"
                    ? "마이크 권한이 필요합니다."
                    : "마이크 권한을 확인하고 있습니다."}
              </p>
              <p className="mt-0.5 text-xs font-light text-contents-tertiary">
                {micStatus === "granted"
                  ? "권한이 허용된 상태입니다."
                  : micStatus === "denied"
                    ? "브라우저 설정에서 마이크를 허용한 뒤 다시 시도하세요."
                    : ""}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={checkMicPermission}
            disabled={micStatus === "checking"}
          >
            {micStatus === "denied" ? "권한 다시 확인" : "권한 상태 확인"}
          </Button>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-border px-8 py-4">
        <Button type="button" variant="outline" onClick={() => navigate("/interviews/new")}>
          조건 다시 설정
        </Button>
        <Button
          type="button"
          onClick={() => navigate(`/record/${questionId}`, { state: navState })}
          disabled={micStatus !== "granted"}
        >
          면접 시작하기
        </Button>
      </div>
    </div>
  )
}
