import { EXPERIENCE_DURATION } from "@/common"
import { AGEventEmitter } from "../events"
import { STTEvents, STTManagerStartOptions, STTManagerOptions, STTManagerInitData } from "./types"
import { RtmManager } from "../rtm"
import { IRequestLanguages } from "@/types"
import { parser } from "../parser"

// Web Speech API types
interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

interface SpeechRecognitionEvent {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionErrorEvent {
  error: string
  message: string
}

interface Window {
  SpeechRecognition: new () => SpeechRecognition
  webkitSpeechRecognition: new () => SpeechRecognition
}

export class SttManager extends AGEventEmitter<STTEvents> {
  option?: STTManagerOptions
  userId: string | number = ""
  channel: string = ""
  rtmManager: RtmManager
  private _init: boolean = false
  private recognition: SpeechRecognition | null = null
  private isTranscribing: boolean = false
  private currentStartTime: number = 0
  private lastEmittedTranscript: string = ""

  get hasInit() {
    return this._init
  }

  constructor(data: STTManagerInitData) {
    super()
    const { rtmManager } = data
    this.rtmManager = rtmManager
  }

  setOption(option: STTManagerOptions) {
    this.option = option
  }

  removeOption() {
    this.option = undefined
  }

  async init({
    userId,
    channel,
    userName,
  }: {
    userId: string | number
    channel: string
    userName: string
  }) {
    this.userId = userId
    this.channel = channel
    await this.rtmManager.join({
      userId: userId + "",
      userName,
      channel,
    })
    this._init = true
  }

  private getSpeechRecognition(): SpeechRecognition | null {
    if (typeof window === "undefined") {
      return null
    }

    const SpeechRecognition =
      (window as unknown as Window).SpeechRecognition ||
      (window as unknown as Window).webkitSpeechRecognition

    if (!SpeechRecognition) {
      console.error("Speech Recognition API is not supported in this browser")
      return null
    }

    return new SpeechRecognition()
  }

  private mapLanguageCode(language: string): string {
    // Map common language codes to Web Speech API format
    const languageMap: Record<string, string> = {
      en: "en-US",
      "en-US": "en-US",
      "en-GB": "en-GB",
      zh: "zh-CN",
      "zh-CN": "zh-CN",
      "zh-TW": "zh-TW",
      es: "es-ES",
      "es-ES": "es-ES",
      fr: "fr-FR",
      "fr-FR": "fr-FR",
      de: "de-DE",
      "de-DE": "de-DE",
      ja: "ja-JP",
      "ja-JP": "ja-JP",
      ko: "ko-KR",
      "ko-KR": "ko-KR",
      pt: "pt-BR",
      "pt-BR": "pt-BR",
      ru: "ru-RU",
      "ru-RU": "ru-RU",
      it: "it-IT",
      "it-IT": "it-IT",
    }

    return languageMap[language] || language || "en-US"
  }

  async startTranscription(startOptions: STTManagerStartOptions) {
    if (!this.hasInit) {
      throw new Error("please init first")
    }
    // Default to English if no languages provided
    let { languages } = startOptions
    if (!languages || !languages.length) {
      languages = [
        {
          source: "en-US",
          target: [],
        },
      ]
    }

    // Check if Speech Recognition is supported
    const recognition = this.getSpeechRecognition()
    if (!recognition) {
      throw new Error("Speech Recognition API is not supported in this browser")
    }

    // Use the first language for recognition (Web Speech API supports one language at a time)
    // Default to English if no language is provided
    const primaryLanguage = languages[0]?.source || "en-US"
    const langCode = this.mapLanguageCode(primaryLanguage)

    // Acquire lock
    await this.rtmManager.acquireLock()
    try {
      this.recognition = recognition
      this.recognition.continuous = true
      this.recognition.interimResults = true
      this.recognition.lang = langCode

      this.currentStartTime = Date.now()
      const taskId = `web-speech-${Date.now()}`
      const token = `web-speech-token-${Date.now()}`

      this.setOption({
        token,
        taskId,
      })

      // Reset tracking variables
      this.lastEmittedTranscript = ""

      // Set up event handlers
      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        const results = event.results
        const resultIndex = event.resultIndex

        // Build complete transcript from all results up to the current index
        let completeTranscript = ""
        let latestIsFinal = false

        for (let i = 0; i <= resultIndex; i++) {
          const result = results[i]
          if (!result) continue

          const transcript = result[0]?.transcript || ""
          if (transcript.trim()) {
            completeTranscript += transcript + " "
          }
          // Track if the latest result is final
          if (i === resultIndex) {
            latestIsFinal = result.isFinal
          }
        }

        completeTranscript = completeTranscript.trim()

        // Only emit if the transcript has actually changed
        if (completeTranscript && completeTranscript !== this.lastEmittedTranscript) {
          this.lastEmittedTranscript = completeTranscript

          const textstream = {
            dataType: "transcribe" as const,
            culture: langCode,
            uid: this.userId,
            startTextTs: this.currentStartTime,
            textTs: Date.now(),
            time: Date.now(),
            durationMs: Date.now() - this.currentStartTime,
            words: [
              {
                text: completeTranscript,
                start_ms: 0,
                duration_ms: Date.now() - this.currentStartTime,
                isFinal: latestIsFinal,
                confidence: latestIsFinal ? 0.9 : 0.8,
              },
            ],
            trans: [],
          }

          // Emit through parser to maintain compatibility
          parser.praseData(textstream)
        }
      }

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error:", event.error, event.message)
        if (event.error === "not-allowed") {
          throw new Error("Microphone permission denied. Please allow microphone access.")
        } else if (event.error === "no-speech") {
          // This is normal, just continue
          return
        }
      }

      this.recognition.onend = () => {
        if (this.isTranscribing) {
          // Restart recognition if it ended unexpectedly
          try {
            this.recognition?.start()
          } catch (error) {
            console.error("Failed to restart recognition:", error)
          }
        }
      }

      // Reset tracking when starting
      this.lastEmittedTranscript = ""

      // Start recognition
      this.recognition.start()
      this.isTranscribing = true

      // Set rtm metadata
      await Promise.all([
        this.rtmManager.updateLanguages(languages),
        this.rtmManager.updateSttData({
          status: "start",
          taskId,
          token,
          startTime: this.currentStartTime,
          duration: EXPERIENCE_DURATION,
        }),
      ])
    } catch (err) {
      await this.rtmManager.releaseLock()
      this.isTranscribing = false
      if (this.recognition) {
        try {
          this.recognition.stop()
        } catch (e) {
          // Ignore errors when stopping
        }
        this.recognition = null
      }
      throw err
    }
    await this.rtmManager.releaseLock()
  }

  async stopTranscription() {
    if (!this.hasInit) {
      throw new Error("please init first")
    }

    // Acquire lock
    await this.rtmManager.acquireLock()
    try {
      // Stop recognition
      if (this.recognition) {
        this.isTranscribing = false
        try {
          this.recognition.stop()
        } catch (error) {
          console.error("Error stopping recognition:", error)
        }
        this.recognition = null
      }

      // Set rtm metadata
      await this.rtmManager.updateSttData({
        status: "end",
      })
    } catch (err) {
      await this.rtmManager.releaseLock()
      throw err
    }
    await this.rtmManager.releaseLock()
  }

  async queryTranscription() {
    // Web Speech API doesn't support querying, return empty result
    return {
      status: this.isTranscribing ? "running" : "stopped",
      message: "Web Speech API transcription is real-time only",
    }
  }

  async updateTranscription(options: { data: any; updateMaskList: string[] }) {
    // Web Speech API doesn't support updating, return empty result
    return {
      status: "not-supported",
      message: "Web Speech API doesn't support updating transcription",
    }
  }

  /**
   *
   * startTime ms
   * duration ms
   */
  async extendDuration({ startTime, duration }: { startTime?: number; duration?: number }) {
    const data: any = {}
    if (startTime) {
      data.startTime = startTime
    }
    if (duration) {
      data.duration = duration
    }
    // set rtm metadata
    await this.rtmManager.updateSttData(data)
  }

  async destroy() {
    // Stop recognition if running
    if (this.recognition) {
      this.isTranscribing = false
      try {
        this.recognition.stop()
      } catch (error) {
        // Ignore errors
      }
      this.recognition = null
    }

    // Reset tracking variables
    this.lastEmittedTranscript = ""

    await this.rtmManager.destroy()
    this.option = undefined
    this.userId = ""
    this.channel = ""
    this._init = false
  }

  // ------------- private -------------
}
