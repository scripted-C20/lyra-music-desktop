const FALLBACK_BACKGROUND = 'rgba(12, 18, 28, 1)'

const clamp = (value, min, max) => {
  if (Number.isNaN(value)) return min
  if (value < min) return min
  if (value > max) return max
  return value
}

const roundChannel = (value) => Math.round(clamp(value, 0, 255))
const roundAlpha = (value) => Number(clamp(value, 0, 1).toFixed(3))

const parseHexColor = (input) => {
  const hex = input.replace('#', '').trim()
  if (![3, 4, 6, 8].includes(hex.length)) return null
  const normalized = hex.length < 6
    ? hex.split('').map(char => char + char).join('')
    : hex
  const hasAlpha = normalized.length == 8
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  const a = hasAlpha ? parseInt(normalized.slice(6, 8), 16) / 255 : 1
  return { r, g, b, a }
}

const parseRgbColor = (input) => {
  const match = /^rgba?\(([^)]+)\)$/i.exec(input.trim())
  if (!match) return null
  const segments = match[1].split(',').map(part => part.trim())
  if (segments.length < 3) return null
  const r = Number(segments[0])
  const g = Number(segments[1])
  const b = Number(segments[2])
  const a = segments[3] == null ? 1 : Number(segments[3])
  if ([r, g, b, a].some(value => Number.isNaN(value))) return null
  return { r, g, b, a }
}

const parseColor = (input) => {
  const color = String(input ?? '').trim()
  if (!color) return parseRgbColor(FALLBACK_BACKGROUND)
  if (color.startsWith('#')) return parseHexColor(color) ?? parseRgbColor(FALLBACK_BACKGROUND)
  return parseRgbColor(color) ?? parseRgbColor(FALLBACK_BACKGROUND)
}

const toRgbaString = ({ r, g, b, a }) => {
  return `rgba(${roundChannel(r)}, ${roundChannel(g)}, ${roundChannel(b)}, ${roundAlpha(a)})`
}

const withAlpha = (color, alpha) => {
  return toRgbaString({ ...parseColor(color), a: alpha })
}

const mixColor = (from, to, amount) => {
  const source = parseColor(from)
  const target = parseColor(to)
  const ratio = clamp(amount, 0, 1)
  const preserveAlpha = source.a
  return toRgbaString({
    r: source.r + (target.r - source.r) * ratio,
    g: source.g + (target.g - source.g) * ratio,
    b: source.b + (target.b - source.b) * ratio,
    a: preserveAlpha,
  })
}

export const getDesktopLyricBackgroundStyles = (backgroundColor, backgroundOpacity) => {
  const opacity = clamp(Number(backgroundOpacity), 0, 100) / 100
  const baseColor = toRgbaString({ ...parseColor(backgroundColor), a: 1 })
  const solidColor = withAlpha(baseColor, opacity)
  const topColor = withAlpha(mixColor(baseColor, 'rgba(255, 255, 255, 1)', 0.04), clamp(opacity * 0.96 + 0.02, 0, 1))
  const bottomColor = withAlpha(mixColor(baseColor, 'rgba(0, 0, 0, 1)', 0.08), clamp(opacity * 0.78 + 0.02, 0, 1))
  const lockTopColor = withAlpha(mixColor(baseColor, 'rgba(255, 255, 255, 1)', 0.05), clamp(opacity * 0.92 + 0.03, 0, 1))
  const lockBottomColor = withAlpha(mixColor(baseColor, 'rgba(0, 0, 0, 1)', 0.1), clamp(opacity * 0.84 + 0.03, 0, 1))
  const interactingTopColor = withAlpha(baseColor, clamp(opacity * 0.98 + 0.01, 0, 1))
  const interactingBottomColor = withAlpha(mixColor(baseColor, 'rgba(0, 0, 0, 1)', 0.06), clamp(opacity * 0.9 + 0.01, 0, 1))

  return {
    baseColor,
    solidColor,
    topColor,
    bottomColor,
    lockTopColor,
    lockBottomColor,
    interactingTopColor,
    interactingBottomColor,
    shadowColor: withAlpha('rgba(0, 0, 0, 1)', clamp(0.14 + opacity * 0.2, 0.14, 0.4)),
    glowColor: withAlpha(baseColor, clamp(opacity * 0.28, 0.08, 0.28)),
    borderColor: withAlpha('rgba(255, 255, 255, 1)', clamp(0.03 + opacity * 0.08, 0.04, 0.14)),
    highlightColor: withAlpha('rgba(255, 255, 255, 1)', clamp(0.04 + opacity * 0.08, 0.06, 0.18)),
    sheenColor: withAlpha('rgba(255, 255, 255, 1)', clamp(0.04 + opacity * 0.04, 0.05, 0.12)),
  }
}
