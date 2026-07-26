import { useCallback, useRef, useState } from "react"

export type RecorderStatus = "idle" | "requesting" | "recording" | "stopped" | "error"

export function useAudioRecorder() {
  const [status, setStatus] = useState<RecorderStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const start = useCallback(async (): Promise<MediaStream | null> => {
    setError(null)
    setAudioBlob(null)
    setStatus("requesting")

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      chunksRef.current = []
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        setAudioBlob(new Blob(chunksRef.current, { type: "audio/webm" }))
        setStatus("stopped")
      }
      recorderRef.current = recorder
      recorder.start()
      setStatus("recording")
      return stream
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "마이크 권한을 가져오지 못했습니다."
      )
      setStatus("error")
      return null
    }
  }, [])

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop()
    }
    recorderRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  return { status, error, audioBlob, start, stop }
}
