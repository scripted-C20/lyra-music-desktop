import { RGB_Linear_Blend, RGB_Alpha_Shade } from './colorUtils'

const FALLBACK_PRIMARY = 'rgb(198, 47, 47)'
const WHITE_COLOR = 'rgb(255, 255, 255)'
const BLACK_COLOR = 'rgb(0, 0, 0)'

export const normalizeDesktopLyricColor = (color?: string | null): string => String(color ?? '').replace(/\s+/g, '').toLowerCase()

const defaultLyricUnplayColors = new Set([
  normalizeDesktopLyricColor('rgba(255, 255, 255, 1)'),
])

const defaultLyricPlayedColors = new Set([
  normalizeDesktopLyricColor('rgba(7, 197, 86, 1)'),
  normalizeDesktopLyricColor('rgba(255, 57, 71, 1)'),
])

const defaultLyricShadowColors = new Set([
  normalizeDesktopLyricColor('rgba(0, 0, 0, 0.14)'),
  normalizeDesktopLyricColor('rgba(0, 0, 0, 0.18)'),
])

const resolvePrimaryColor = (primaryColor?: string | null): string => {
  return primaryColor?.trim() ? primaryColor : FALLBACK_PRIMARY
}

const resolveCustomColor = (
  color: string | null | undefined,
  fallbackColor: string,
): string => {
  return color?.trim() ? color : fallbackColor
}

export const isDefaultDesktopLyricUnplayColor = (color?: string | null): boolean => {
  return defaultLyricUnplayColors.has(normalizeDesktopLyricColor(color))
}

export const isDefaultDesktopLyricPlayedColor = (color?: string | null): boolean => {
  return defaultLyricPlayedColors.has(normalizeDesktopLyricColor(color))
}

export const isDefaultDesktopLyricShadowColor = (color?: string | null): boolean => {
  return defaultLyricShadowColors.has(normalizeDesktopLyricColor(color))
}

const buildDefaultUnplayColor = (primaryColor?: string | null): string => {
  return RGB_Linear_Blend(0.08, WHITE_COLOR, resolvePrimaryColor(primaryColor))
}

const buildDefaultPlayedColor = (primaryColor?: string | null): string => {
  return resolvePrimaryColor(primaryColor)
}

const buildDefaultShadowColor = (primaryColor?: string | null): string => {
  const mixedColor = RGB_Linear_Blend(0.1, BLACK_COLOR, resolvePrimaryColor(primaryColor))
  return RGB_Alpha_Shade(0.84, mixedColor)
}

export const getDesktopLyricThemeColors = (
  primaryColor?: string | null,
  {
    unplayColor,
    playedColor,
    shadowColor,
  }: {
    unplayColor?: string | null
    playedColor?: string | null
    shadowColor?: string | null
  } = {},
) => {
  const defaultUnplayColor = buildDefaultUnplayColor(primaryColor)
  const defaultPlayedColor = buildDefaultPlayedColor(primaryColor)
  const defaultShadowColor = buildDefaultShadowColor(primaryColor)
  const resolvedUnplayColor = isDefaultDesktopLyricUnplayColor(unplayColor)
    ? defaultUnplayColor
    : resolveCustomColor(unplayColor, defaultUnplayColor)
  const resolvedPlayedColor = isDefaultDesktopLyricPlayedColor(playedColor)
    ? defaultPlayedColor
    : resolveCustomColor(playedColor, defaultPlayedColor)
  const resolvedShadowColor = isDefaultDesktopLyricShadowColor(shadowColor)
    ? defaultShadowColor
    : resolveCustomColor(shadowColor, defaultShadowColor)

  return {
    unplayColor: resolvedUnplayColor,
    playedColor: resolvedPlayedColor,
    shadowColor: resolvedShadowColor,
    shadowFontModeColor: RGB_Alpha_Shade(0.49, resolvedShadowColor),
  }
}
