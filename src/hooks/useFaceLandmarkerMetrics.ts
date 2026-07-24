import { useCallback, useRef, useState } from "react"
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision"
import { extractSample, summarizeSamples, type FrameSample } from "@/lib/facialMetrics"
import type { FacialMetrics } from "@/types"

const WASM_BASE_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
const MODEL_ASSET_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"

let sharedLandmarkerPromise: Promise<FaceLandmarker> | null = null

function getFaceLandmarker() {
  if (!sharedLandmarkerPromise) {
    sharedLandmarkerPromise = FilesetResolver.forVisionTasks(WASM_BASE_URL)
      .then((filesetResolver) =>
        FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: { modelAssetPath: MODEL_ASSET_URL, delegate: "GPU" },
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
          runningMode: "VIDEO",
          numFaces: 1,
        })
      )
      .catch((err) => {
        // 로드 실패를 영구 캐싱하지 않음 — 다음 시도에서 재시도 가능하도록 리셋
        sharedLandmarkerPromise = null
        throw err
      })
  }
  return sharedLandmarkerPromise
}

export function useFaceLandmarkerMetrics() {
  const [isTracking, setIsTracking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const samplesRef = useRef<FrameSample[]>([])
  const rafIdRef = useRef<number | null>(null)

  const start = useCallback(async (video: HTMLVideoElement) => {
    setError(null)
    samplesRef.current = []

    try {
      const landmarker = await getFaceLandmarker()
      setIsTracking(true)

      const loop = () => {
        if (video.readyState >= 2) {
          const ts = performance.now()
          const result = landmarker.detectForVideo(video, ts)
          const categories = result.faceBlendshapes?.[0]?.categories ?? []
          const matrices = result.facialTransformationMatrixes ?? []
          samplesRef.current.push(extractSample(categories, ts, matrices))
        }
        rafIdRef.current = requestAnimationFrame(loop)
      }
      rafIdRef.current = requestAnimationFrame(loop)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "표정 분석 모델을 불러오지 못했습니다."
      )
      setIsTracking(false)
    }
  }, [])

  const stop = useCallback((): FacialMetrics => {
    if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current)
    rafIdRef.current = null
    setIsTracking(false)
    return summarizeSamples(samplesRef.current)
  }, [])

  return { isTracking, error, start, stop }
}
