// ponytail: 임계치는 실제 마이크/환경 데이터로 튜닝 필요한 자리표시자
export const PITCH_DETECTION_MIN_RMS = 0.01
export const MIN_PITCH_HZ = 70
export const MAX_PITCH_HZ = 500

export function computeRms(buffer: Float32Array): number {
  let sumSquares = 0
  for (let i = 0; i < buffer.length; i++) {
    sumSquares += buffer[i] * buffer[i]
  }
  return Math.sqrt(sumSquares / buffer.length)
}

export function estimatePitchHz(
  buffer: Float32Array,
  sampleRate: number
): number | null {
  if (computeRms(buffer) < PITCH_DETECTION_MIN_RMS) return null

  const minLag = Math.floor(sampleRate / MAX_PITCH_HZ)
  const maxLag = Math.floor(sampleRate / MIN_PITCH_HZ)

  let bestLag = -1
  let bestCorrelation = 0
  for (let lag = minLag; lag <= maxLag && lag < buffer.length; lag++) {
    let correlation = 0
    for (let i = 0; i < buffer.length - lag; i++) {
      correlation += buffer[i] * buffer[i + lag]
    }
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation
      bestLag = lag
    }
  }

  return bestLag === -1 ? null : sampleRate / bestLag
}

export interface VoiceFrameSample {
  rms: number
  pitchHz: number | null
}

// ponytail: 임계치는 실제 데이터로 튜닝 필요한 자리표시자
export const QUIET_RMS_THRESHOLD = 0.02
export const TREMBLE_PITCH_STDDEV_THRESHOLD_HZ = 15
export const PITCH_WINDOW_SIZE = 5

export function extractVoiceSample(
  buffer: Float32Array,
  sampleRate: number
): VoiceFrameSample {
  return { rms: computeRms(buffer), pitchHz: estimatePitchHz(buffer, sampleRate) }
}

export function summarizeVoiceSamples(samples: VoiceFrameSample[]): {
  quietRatio: number
  trembleRatio: number
} {
  if (samples.length === 0) return { quietRatio: 0, trembleRatio: 0 }

  const quietRatio =
    samples.filter((s) => s.rms < QUIET_RMS_THRESHOLD).length / samples.length

  if (samples.length < PITCH_WINDOW_SIZE) return { quietRatio, trembleRatio: 0 }

  let trembleWindows = 0
  let totalWindows = 0
  for (let i = 0; i + PITCH_WINDOW_SIZE <= samples.length; i++) {
    const pitches = samples
      .slice(i, i + PITCH_WINDOW_SIZE)
      .map((s) => s.pitchHz)
      .filter((p): p is number => p !== null)
    if (pitches.length < 2) continue

    totalWindows += 1
    const mean = pitches.reduce((sum, p) => sum + p, 0) / pitches.length
    const variance =
      pitches.reduce((sum, p) => sum + (p - mean) ** 2, 0) / pitches.length
    if (Math.sqrt(variance) > TREMBLE_PITCH_STDDEV_THRESHOLD_HZ) trembleWindows += 1
  }

  const trembleRatio = totalWindows === 0 ? 0 : trembleWindows / totalWindows
  return { quietRatio, trembleRatio }
}
