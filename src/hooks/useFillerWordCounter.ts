import { useCallback, useRef, useState } from "react"
import { countFillerWords } from "@/lib/fillerWords"

interface SpeechRecognitionResultLike {
  0: { transcript: string }
}

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: ArrayLike<SpeechRecognitionResultLike>
}

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  start(): void
  stop(): void
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function useFillerWordCounter() {
  const [error, setError] = useState<string | null>(null)
  const countRef = useRef(0)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  const start = useCallback(() => {
    setError(null)
    countRef.current = 0

    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) {
      setError("이 브라우저는 음성 인식을 지원하지 않습니다.")
      return
    }

    const recognition = new Ctor()
    recognition.lang = "ko-KR"
    recognition.continuous = true
    recognition.interimResults = false
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        countRef.current += countFillerWords(event.results[i][0].transcript)
      }
    }
    recognition.start()
    recognitionRef.current = recognition
  }, [])

  const stop = useCallback((): { fillerWordCount: number } => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    return { fillerWordCount: countRef.current }
  }, [])

  return { error, start, stop }
}
