/**
 * Video Enhancement Utility
 * Enhances video quality with brightness, contrast, and skin tone improvements
 */

export interface VideoEnhancementOptions {
  brightness?: number // -1.0 to 1.0, default: 0.15 (brighten)
  contrast?: number // -1.0 to 1.0, default: 0.2 (increase contrast)
  saturation?: number // -1.0 to 1.0, default: 0.1 (slight saturation boost for skin tones)
  skinToneBoost?: number // 0.0 to 1.0, default: 0.3 (brighten skin tones)
}

/**
 * Process video frame to enhance brightness, contrast, and skin tones
 */
export function processVideoFrame(
  imageData: ImageData,
  options: VideoEnhancementOptions = {},
): ImageData {
  const {
    brightness = 0.15, // Brighten by 15%
    contrast = 0.2, // Increase contrast by 20%
    saturation = 0.1, // Slight saturation boost
    skinToneBoost = 0.3, // Brighten skin tones by 30%
  } = options

  const data = imageData.data
  const length = data.length

  // Process each pixel (RGBA format)
  for (let i = 0; i < length; i += 4) {
    let r = data[i]
    let g = data[i + 1]
    let b = data[i + 2]

    // Convert RGB to HSL for better color manipulation
    const hsl = rgbToHsl(r, g, b)

    // Detect skin tones (hue range: 0-30 and 330-360, saturation: 0.2-0.7)
    const isSkinTone =
      (hsl.h >= 0 && hsl.h <= 30) || (hsl.h >= 330 && hsl.h <= 360)
        ? hsl.s >= 0.2 && hsl.s <= 0.7 && hsl.l >= 0.2 && hsl.l <= 0.8
        : false

    // Apply brightness adjustment
    // Brightness: add value to all channels
    const brightnessFactor = 1 + brightness
    r = Math.min(255, Math.max(0, r * brightnessFactor))
    g = Math.min(255, Math.max(0, g * brightnessFactor))
    b = Math.min(255, Math.max(0, b * brightnessFactor))

    // Apply contrast
    // Contrast: adjust around midpoint (128)
    const contrastFactor = 1 + contrast
    r = Math.min(255, Math.max(0, (r - 128) * contrastFactor + 128))
    g = Math.min(255, Math.max(0, (g - 128) * contrastFactor + 128))
    b = Math.min(255, Math.max(0, (b - 128) * contrastFactor + 128))

    // Apply skin tone boost (brighten skin tones more)
    if (isSkinTone) {
      const skinBoost = 1 + skinToneBoost
      r = Math.min(255, Math.max(0, r * skinBoost))
      g = Math.min(255, Math.max(0, g * skinBoost))
      b = Math.min(255, Math.max(0, b * skinBoost))
    }

    // Apply saturation boost
    const hslEnhanced = rgbToHsl(r, g, b)
    hslEnhanced.s = Math.min(1, Math.max(0, hslEnhanced.s * (1 + saturation)))
    const rgbEnhanced = hslToRgb(hslEnhanced.h, hslEnhanced.s, hslEnhanced.l)

    data[i] = rgbEnhanced.r
    data[i + 1] = rgbEnhanced.g
    data[i + 2] = rgbEnhanced.b
    // Alpha channel (data[i + 3]) remains unchanged
  }

  return imageData
}

/**
 * Convert RGB to HSL color space
 */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return { h: h * 360, s, l }
}

/**
 * Convert HSL to RGB color space
 */
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360
  let r: number, g: number, b: number

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  }
}

/**
 * Create a canvas-based video processor for real-time enhancement
 */
export function createVideoProcessor(
  canvas: HTMLCanvasElement,
  options: VideoEnhancementOptions = {},
): {
  processFrame: (videoElement: HTMLVideoElement) => void
  destroy: () => void
} {
  const ctx = canvas.getContext("2d", {
    willReadFrequently: true,
  })

  if (!ctx) {
    throw new Error("Failed to get canvas context")
  }

  let animationFrameId: number | null = null
  let isProcessing = false

  const processFrame = (videoElement: HTMLVideoElement) => {
    if (isProcessing || videoElement.readyState < 2) return

    isProcessing = true

    try {
      // Set canvas size to match video
      if (canvas.width !== videoElement.videoWidth || canvas.height !== videoElement.videoHeight) {
        canvas.width = videoElement.videoWidth
        canvas.height = videoElement.videoHeight
      }

      // Draw video frame to canvas
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)

      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      // Process frame with enhancements
      const enhancedImageData = processVideoFrame(imageData, options)

      // Put enhanced image data back
      ctx.putImageData(enhancedImageData, 0, 0)
    } catch (error) {
      console.warn("Video frame processing error:", error)
    } finally {
      isProcessing = false
    }
  }

  const destroy = () => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }

  return { processFrame, destroy }
}
