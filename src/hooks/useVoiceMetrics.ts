import { useCallback, useRef, useState } from "react"
import {
  extractVoiceSample,
  summarizeVoiceSamples,
  type VoiceFrameSample,
} from "@/lib/voiceMetrics"

const FFT_SIZE = 2048

export function useVoiceMetrics() {
  const [error, setError] = useState<string | null>(null)
  const samplesRef = useRef<VoiceFrameSample[]>([])
  const rafIdRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  const start = useCallback((stream: MediaStream) => {
    setError(null)
    samplesRef.current = []

    try {
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = FFT_SIZE
      source.connect(analyser)
      audioContextRef.current = audioContext

      const buffer = new Float32Array(analyser.fftSize)
      const loop = () => {
        analyser.getFloatTimeDomainData(buffer)
        samplesRef.current.push(extractVoiceSample(buffer, audioContext.sampleRate))
        rafIdRef.current = requestAnimationFrame(loop)
      }
      rafIdRef.current = requestAnimationFrame(loop)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "음성 분석을 시작하지 못했습니다."
      )
    }
  }, [])

  const stop = useCallback(() => {
    if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current)
    rafIdRef.current = null
    void audioContextRef.current?.close()
    audioContextRef.current = null
    return summarizeVoiceSamples(samplesRef.current)
  }, [])

  return { error, start, stop }
}
