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
