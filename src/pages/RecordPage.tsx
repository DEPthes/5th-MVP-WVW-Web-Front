import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ErrorState } from "@/components/ErrorState"
import { LoadingState } from "@/components/LoadingState"
import { useFaceLandmarkerMetrics } from "@/hooks/useFaceLandmarkerMetrics"
import { useFillerWordCounter } from "@/hooks/useFillerWordCounter"
import { useMediaRecorderCapture } from "@/hooks/useMediaRecorderCapture"
import { useVoiceMetrics } from "@/hooks/useVoiceMetrics"
import { uploadAnswer } from "@/lib/api"
import type { FacialMetrics, VoiceMetrics } from "@/types"

export function RecordPage() {
  const { status, error, videoBlob, videoPreviewRef, start, stop } =
    useMediaRecorderCapture()
  const faceMetrics = useFaceLandmarkerMetrics()
  const voiceMetrics = useVoiceMetrics()
  const fillerWordCounter = useFillerWordCounter()
  const { questionId } = useParams<{ questionId: string }>()
  const navigate = useNavigate()
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null)
  const [facialMetrics, setFacialMetrics] = useState<FacialMetrics | null>(null)
  const [voiceMetricsResult, setVoiceMetricsResult] = useState<VoiceMetrics | null>(null)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "error">("idle")
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => {
    if (!videoBlob) return
    const url = URL.createObjectURL(videoBlob)
    setPlaybackUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [videoBlob])

  function runUpload(blob: Blob, facial: FacialMetrics, voice: VoiceMetrics) {
    setUploadStatus("uploading")
    setUploadError(null)
    uploadAnswer(questionId!, blob, facial, voice)
      .then((answer) => {
        navigate(`/result/${answer.id}`)
      })
      .catch((err) => {
        setUploadStatus("error")
        setUploadError(err instanceof Error ? err.message : "업로드에 실패했습니다.")
      })
  }

  useEffect(() => {
    if (!videoBlob || !facialMetrics || !voiceMetricsResult) return
    runUpload(videoBlob, facialMetrics, voiceMetricsResult)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- videoBlob이 세 값 중 가장 늦게 도착하므로 그 시점에만 트리거
  }, [videoBlob, facialMetrics, voiceMetricsResult])

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
    setUploadStatus("idle")
    setUploadError(null)
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
          disabled={
            status === "recording" ||
            status === "requesting" ||
            uploadStatus === "uploading"
          }
        >
          녹화 시작
        </Button>
        <Button
          variant="outline"
          onClick={handleStop}
          disabled={status !== "recording" || uploadStatus === "uploading"}
        >
          녹화 종료
        </Button>
      </div>

      {status === "error" && <ErrorState message={error!} />}
      {faceMetrics.error && <ErrorState message={faceMetrics.error} />}
      {fillerWordCounter.error && (
        <ErrorState message={fillerWordCounter.error} />
      )}

      {uploadStatus === "uploading" && <LoadingState message="업로드 중..." />}
      {uploadStatus === "error" && (
        <ErrorState
          message={uploadError!}
          retry={() => {
            if (videoBlob && facialMetrics && voiceMetricsResult) {
              runUpload(videoBlob, facialMetrics, voiceMetricsResult)
            }
          }}
        />
      )}

      {playbackUrl && (
        <video controls src={playbackUrl} className="w-80 rounded-lg" />
      )}

      {facialMetrics && (
        <p className="text-sm text-muted-foreground">
          아이컨택 비율: {(facialMetrics.eyeContactRatio * 100).toFixed(0)}% ·
          분당 깜빡임: {facialMetrics.blinkRate.toFixed(1)}회 · 호감도:{" "}
          {(facialMetrics.likabilityScore * 100).toFixed(0)}% · 긴장도:{" "}
          {(facialMetrics.tensionScore * 100).toFixed(0)}% · 무표정도:{" "}
          {(facialMetrics.neutralScore * 100).toFixed(0)}%
        </p>
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
