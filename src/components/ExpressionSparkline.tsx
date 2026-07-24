interface ExpressionSparklineProps {
  values: number[]
}

export function ExpressionSparkline({ values }: ExpressionSparklineProps) {
  if (values.length === 0) return null

  const max = Math.max(...values, 0.01)
  const points = values
    .map(
      (v, i) =>
        `${(i / Math.max(values.length - 1, 1)) * 100},${100 - (v / max) * 100}`
    )
    .join(" ")

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="h-12 w-full text-muted-foreground"
    >
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth={2} />
    </svg>
  )
}
