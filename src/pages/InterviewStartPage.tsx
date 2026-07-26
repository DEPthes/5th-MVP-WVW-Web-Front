import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"

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

  return (
    <div className="flex flex-col gap-4">
      <h1>시작 전 확인</h1>
      <p className="text-sm text-muted-foreground">
        질문은 음성으로 재생되며 답변은 녹음 후 텍스트로 변환됩니다.
      </p>

      <ul className="flex flex-col gap-3">
        {CHECKLIST.map((item) => (
          <li
            key={item.title}
            className="flex items-start gap-3 rounded-lg border border-border p-3"
          >
            <Check aria-hidden className="mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted p-3">
        <div>
          <p className="text-sm font-medium">
            {micStatus === "granted"
              ? "마이크를 사용할 수 있습니다."
              : micStatus === "denied"
                ? "마이크 권한이 필요합니다."
                : "마이크 권한을 확인하고 있습니다."}
          </p>
          <p className="text-sm text-muted-foreground">
            {micStatus === "granted"
              ? "권한이 허용된 상태입니다."
              : micStatus === "denied"
                ? "브라우저 설정에서 마이크를 허용한 뒤 다시 시도하세요."
                : ""}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={checkMicPermission}
          disabled={micStatus === "checking"}
        >
          {micStatus === "denied" ? "권한 다시 확인" : "권한 상태 확인"}
        </Button>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => navigate("/interviews/new")}>
          조건 다시 설정
        </Button>
        <Button
          type="button"
          onClick={() => navigate(`/record/${questionId}`)}
          disabled={micStatus !== "granted"}
        >
          면접 시작하기
        </Button>
      </div>
    </div>
  )
}
