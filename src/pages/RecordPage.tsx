import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { useMediaRecorderCapture } from "@/hooks/useMediaRecorderCapture"

export function RecordPage() {
  const { status, error, videoBlob, videoPreviewRef, start, stop } =
    useMediaRecorderCapture()
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!videoBlob) return
    const url = URL.createObjectURL(videoBlob)
    setPlaybackUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [videoBlob])

  return (
    <div className="flex flex-col gap-4">
      <h1>답변 녹화</h1>

      <video
        ref={videoPreviewRef}
        autoPlay
        muted
        playsInline
        className="w-80 rounded-lg bg-muted"
      />

      <div className="flex gap-2">
        <Button
          onClick={start}
          disabled={status === "recording" || status === "requesting"}
        >
          녹화 시작
        </Button>
        <Button
          variant="outline"
          onClick={stop}
          disabled={status !== "recording"}
        >
          녹화 종료
        </Button>
      </div>

      {status === "error" && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {playbackUrl && (
        <video controls src={playbackUrl} className="w-80 rounded-lg" />
      )}
    </div>
  )
}
