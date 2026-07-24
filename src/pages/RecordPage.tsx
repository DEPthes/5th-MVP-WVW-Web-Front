import { useEffect, useState } from "react"
import { ExpressionSparkline } from "@/components/ExpressionSparkline"
import { Button } from "@/components/ui/button"
import { useFaceLandmarkerMetrics } from "@/hooks/useFaceLandmarkerMetrics"
import { useFillerWordCounter } from "@/hooks/useFillerWordCounter"
import { useMediaRecorderCapture } from "@/hooks/useMediaRecorderCapture"
import { useVoiceMetrics } from "@/hooks/useVoiceMetrics"
import type { FacialMetrics, VoiceMetrics } from "@/types"

export function RecordPage() {
  const { status, error, videoBlob, videoPreviewRef, start, stop } =
    useMediaRecorderCapture()
  const faceMetrics = useFaceLandmarkerMetrics()
  const voiceMetrics = useVoiceMetrics()
  const fillerWordCounter = useFillerWordCounter()
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null)
  const [facialMetrics, setFacialMetrics] = useState<FacialMetrics | null>(null)
  const [voiceMetricsResult, setVoiceMetricsResult] = useState<VoiceMetrics | null>(null)

  useEffect(() => {
    if (!videoBlob) return
    const url = URL.createObjectURL(videoBlob)
    setPlaybackUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [videoBlob])

  useEffect(() => {
    return () => {
      stop()
      faceMetrics.stop()
      voiceMetrics.stop()
      fillerWordCounter.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 언마운트 시 1회만 정리, 각 stop은 useCallback으로 참조가 안정적이다
  }, [])

  const handleStart = async () => {
    setFacialMetrics(null)
    setVoiceMetricsResult(null)
    const stream = await start()
    if (videoPreviewRef.current) {
      faceMetrics.start(videoPreviewRef.current)
    }
    if (stream) {
      voiceMetrics.start(stream)
    }
    fillerWordCounter.start()
  }

  const handleStop = () => {
    stop()
    const metrics = faceMetrics.stop()
    setFacialMetrics(metrics)

    const { quietRatio, trembleRatio } = voiceMetrics.stop()
    const { fillerWordCount } = fillerWordCounter.stop()
    setVoiceMetricsResult({ fillerWordCount, quietRatio, trembleRatio })
  }

  return (
    <div className="flex flex-col gap-4">
      <h1>답변 녹화</h1>

      <video
        ref={videoPreviewRef}
        autoPlay
        muted
        playsInline
        className="w-80 -scale-x-100 rounded-lg bg-muted"
      />

      <div className="flex gap-2">
        <Button
          onClick={handleStart}
          disabled={status === "recording" || status === "requesting"}
        >
          녹화 시작
        </Button>
        <Button
          variant="outline"
          onClick={handleStop}
          disabled={status !== "recording"}
        >
          녹화 종료
        </Button>
      </div>

      {status === "error" && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {faceMetrics.error && (
        <p className="text-sm text-destructive">{faceMetrics.error}</p>
      )}
      {fillerWordCounter.error && (
        <p className="text-sm text-destructive">{fillerWordCounter.error}</p>
      )}

      {playbackUrl && (
        <video controls src={playbackUrl} className="w-80 rounded-lg" />
      )}

      {facialMetrics && (
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">
            아이컨택 비율: {(facialMetrics.eyeContactRatio * 100).toFixed(0)}% ·
            표정 변화 횟수: {facialMetrics.expressionChanges} · 분당 깜빡임:{" "}
            {facialMetrics.blinkRate.toFixed(1)}회
          </p>
          <ExpressionSparkline values={facialMetrics.expressionTimeline} />
        </div>
      )}

      {voiceMetricsResult && (
        <p className="text-sm text-muted-foreground">
          필러워드: {voiceMetricsResult.fillerWordCount}회 · 작은 목소리 구간:{" "}
          {(voiceMetricsResult.quietRatio * 100).toFixed(0)}% · 떨림 구간:{" "}
          {(voiceMetricsResult.trembleRatio * 100).toFixed(0)}%
        </p>
      )}
    </div>
  )
}
