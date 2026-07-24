import { useCallback, useRef, useState } from "react"

export type RecorderStatus = "idle" | "requesting" | "recording" | "stopped" | "error"

export function useMediaRecorderCapture() {
  const [status, setStatus] = useState<RecorderStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null)

  const videoPreviewRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const start = useCallback(async (): Promise<MediaStream | null> => {
    setError(null)
    setVideoBlob(null)
    setStatus("requesting")

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })
      streamRef.current = stream
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream
      }

      chunksRef.current = []
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        setVideoBlob(new Blob(chunksRef.current, { type: "video/webm" }))
        setStatus("stopped")
      }
      recorderRef.current = recorder
      recorder.start()
      setStatus("recording")
      return stream
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "카메라/마이크 권한을 가져오지 못했습니다."
      )
      setStatus("error")
      return null
    }
  }, [])

  const stop = useCallback(() => {
    recorderRef.current?.stop()
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  return { status, error, videoBlob, videoPreviewRef, start, stop }
}
