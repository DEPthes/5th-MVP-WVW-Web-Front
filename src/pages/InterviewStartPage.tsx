import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ErrorState } from "@/components/ErrorState"

export function InterviewStartPage() {
  const { questionId } = useParams<{ questionId: string }>()
  const navigate = useNavigate()
  const [status, setStatus] = useState<"idle" | "checking" | "denied">("idle")

  async function handleStart() {
    setStatus("checking")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())
      navigate(`/record/${questionId}`)
    } catch {
      setStatus("denied")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1>면접 시작 안내</h1>
      <p className="text-sm text-muted-foreground">
        답변은 음성으로 녹음됩니다. 마이크 권한을 허용해주세요.
      </p>

      <Button onClick={handleStart} disabled={status === "checking"}>
        면접 시작
      </Button>

      {status === "denied" && (
        <ErrorState
          message="마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용한 뒤 다시 시도해주세요."
          retry={handleStart}
        />
      )}
    </div>
  )
}
