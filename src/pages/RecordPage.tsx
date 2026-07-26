import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ErrorState } from "@/components/ErrorState"
import { LoadingState } from "@/components/LoadingState"
import { useAudioRecorder } from "@/hooks/useAudioRecorder"
import { uploadAnswer } from "@/lib/api"

export function RecordPage() {
  const { status, error, audioBlob, start, stop } = useAudioRecorder()
  const { questionId } = useParams<{ questionId: string }>()
  const navigate = useNavigate()
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "error">("idle")
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => {
    if (!audioBlob) return
    const url = URL.createObjectURL(audioBlob)
    setPlaybackUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [audioBlob])

  function runUpload(blob: Blob) {
    setUploadStatus("uploading")
    setUploadError(null)
    uploadAnswer(questionId!, blob)
      .then((answer) => {
        navigate(`/result/${answer.id}`)
      })
      .catch((err) => {
        setUploadStatus("error")
        setUploadError(err instanceof Error ? err.message : "업로드에 실패했습니다.")
      })
  }

  useEffect(() => {
    if (!audioBlob) return
    runUpload(audioBlob)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- audioBlob 준비 시점에만 트리거
  }, [audioBlob])

  useEffect(() => {
    return () => stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 언마운트 시 1회만 정리, stop은 useCallback으로 참조가 안정적이다
  }, [])

  const handleStart = async () => {
    setUploadStatus("idle")
    setUploadError(null)
    await start()
  }

  return (
    <div className="flex flex-col gap-4">
      <h1>답변 녹음</h1>

      <div className="flex gap-2">
        <Button
          onClick={handleStart}
          disabled={
            status === "recording" ||
            status === "requesting" ||
            uploadStatus === "uploading"
          }
        >
          녹음 시작
        </Button>
        <Button
          variant="outline"
          onClick={stop}
          disabled={status !== "recording" || uploadStatus === "uploading"}
        >
          녹음 종료
        </Button>
      </div>

      {status === "error" && <ErrorState message={error!} />}

      {uploadStatus === "uploading" && <LoadingState message="업로드 중..." />}
      {uploadStatus === "error" && (
        <ErrorState
          message={uploadError!}
          retry={() => {
            if (audioBlob) runUpload(audioBlob)
          }}
        />
      )}

      {playbackUrl && <audio controls src={playbackUrl} />}
    </div>
  )
}
