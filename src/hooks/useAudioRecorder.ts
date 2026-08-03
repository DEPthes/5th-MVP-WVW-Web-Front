import { useCallback, useRef, useState } from "react"

export type RecorderStatus = "idle" | "requesting" | "recording" | "stopped" | "error"

const SAMPLE_RATE = 16000

// STT 백엔드가 요구하는 스펙(LINEAR16 PCM / 16000Hz / 모노)에 맞춰
// 44바이트 RIFF/WAVE 헤더를 직접 써서 WAV Blob을 만든다.
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  function writeString(offset: number, text: string) {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i))
    }
  }

  writeString(0, "RIFF")
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(8, "WAVE")
  writeString(12, "fmt ")
  view.setUint32(16, 16, true) // fmt chunk size
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true) // byte rate (1채널 x 2바이트)
  view.setUint16(32, 2, true) // block align
  view.setUint16(34, 16, true) // bits per sample
  writeString(36, "data")
  view.setUint32(40, samples.length * 2, true)

  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    offset += 2
  }

  return new Blob([view], { type: "audio/wav" })
}

export function useAudioRecorder() {
  const [status, setStatus] = useState<RecorderStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)

  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const silentGainRef = useRef<GainNode | null>(null)
  const framesRef = useRef<Float32Array[]>([])

  const start = useCallback(async (): Promise<MediaStream | null> => {
    setError(null)
    setAudioBlob(null)
    setStatus("requesting")

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: SAMPLE_RATE },
      })
      streamRef.current = stream

      // ponytail: ScriptProcessorNode는 deprecated지만 워클릿 모듈 파일 없이
      // 바로 쓸 수 있어 채택. 실시간 웨이브폼 등으로 성능이 문제되면
      // AudioWorkletNode로 교체.
      const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE })
      audioContextRef.current = audioContext
      const source = audioContext.createMediaStreamSource(stream)
      sourceRef.current = source
      const processor = audioContext.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor
      const silentGain = audioContext.createGain()
      silentGain.gain.value = 0
      silentGainRef.current = silentGain

      framesRef.current = []
      processor.onaudioprocess = (event) => {
        framesRef.current.push(new Float32Array(event.inputBuffer.getChannelData(0)))
      }

      // destination에 연결해야 onaudioprocess가 안정적으로 발생하므로,
      // 마이크 소리가 스피커로 새지 않도록 무음 게인 노드를 거쳐 연결한다.
      source.connect(processor)
      processor.connect(silentGain)
      silentGain.connect(audioContext.destination)

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
    processorRef.current?.disconnect()
    silentGainRef.current?.disconnect()
    sourceRef.current?.disconnect()
    processorRef.current = null
    silentGainRef.current = null
    sourceRef.current = null

    if (audioContextRef.current) {
      const context = audioContextRef.current
      audioContextRef.current = null
      void context.close()
    }

    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null

    const frames = framesRef.current
    framesRef.current = []
    if (frames.length === 0) return

    const totalLength = frames.reduce((sum, frame) => sum + frame.length, 0)
    const merged = new Float32Array(totalLength)
    let position = 0
    for (const frame of frames) {
      merged.set(frame, position)
      position += frame.length
    }

    setAudioBlob(encodeWav(merged, SAMPLE_RATE))
    setStatus("stopped")
  }, [])

  return { status, error, audioBlob, start, stop }
}
