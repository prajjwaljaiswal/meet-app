import AgoraRTC, {
  IAgoraRTCClient,
  IMicrophoneAudioTrack,
  IRemoteAudioTrack,
  ILocalVideoTrack,
  ILocalScreenVideoTrack,
  UID,
} from "agora-rtc-sdk-ng"
import { AGEventEmitter } from "../events"
import { RtcEvents, IUserTracks } from "./types"
import { parser } from "../parser"
import { apiGetAgoraToken } from "@/common"
import { processVideoFrame } from "./videoEnhancer"

const appId = import.meta.env.VITE_AGORA_APP_ID

export class RtcManager extends AGEventEmitter<RtcEvents> {
  private _joined
  client: IAgoraRTCClient
  screenClient?: IAgoraRTCClient
  localTracks: IUserTracks
  screenTrack?: ILocalScreenVideoTrack
  private _channel?: string
  private _userId?: number | string
  private _screenClientJoined: boolean = false

  constructor() {
    super()
    this._joined = false
    this.localTracks = {}
    // Use H.264 codec for better quality and compatibility
    this.client = AgoraRTC.createClient({ mode: "rtc", codec: "h264" })
    this._listenRtcEvents()
    this._listenParserStreamEvent()
  }

  async join({ channel, userId }: { channel: string; userId: number | string }) {
    if (!this._joined) {
      const token = await apiGetAgoraToken({ channel, uid: userId })
      await this.client?.join(appId, channel, token, userId)
      this._joined = true
      // Store channel and userId for screen client
      this._channel = channel
      this._userId = userId
    }
  }

  async createTracks() {
    const tracks = await AgoraRTC.createMicrophoneAndCameraTracks(
      {
        // Audio configuration - enable audio enhancements for better quality
        AGC: true, // Enable Automatic Gain Control for better audio quality
        ANS: true, // Enable Automatic Noise Suppression
        AEC: true, // Enable Acoustic Echo Cancellation
      },
      {
        // Video encoder configuration for high quality (720p)
        encoderConfig: "720p_1", // 1280x720, 30fps, ~1130kbps
      }
    )
    this.localTracks.audioTrack = tracks[0]
    this.localTracks.videoTrack = tracks[1]
    
    // Set higher quality encoder configuration after track creation
    // This allows us to customize bitrate for even better quality
    if (this.localTracks.videoTrack && "setEncoderConfiguration" in this.localTracks.videoTrack) {
      try {
        await this.localTracks.videoTrack.setEncoderConfiguration({
          width: 1280,
          height: 720,
          frameRate: 30,
          bitrateMax: 2000, // Maximum bitrate in kbps for high quality
          bitrateMin: 800,  // Minimum bitrate in kbps
        })
      } catch (error) {
        console.warn("Failed to set custom encoder configuration, using default:", error)
      }
    }
    
    // Apply video enhancement: brightness, contrast, and skin tone improvements
    if (this.localTracks.videoTrack) {
      try {
        // Use built-in beauty effect for brightness, contrast, and skin tone enhancement
        // This is the standard Agora SDK method for video enhancement
        if ("setBeautyEffect" in this.localTracks.videoTrack) {
          // @ts-ignore - setBeautyEffect is available in Agora SDK but may not be in types
          await this.localTracks.videoTrack.setBeautyEffect(true, {
            lighteningContrastLevel: 1, // 0: low, 1: normal, 2: high - enhances contrast
            lighteningLevel: 0.7, // 0.0-1.0, brightens the overall image and skin
            smoothnessLevel: 0.5, // 0.0-1.0, smooths skin texture
            rednessLevel: 0.1, // 0.0-1.0, adds warmth to skin tone
          })
        }
      } catch (error) {
        console.warn("Failed to apply beauty effect, trying alternative method:", error)
        
        // Fallback: Try using video processor if beauty effect is not available
        try {
          // Create a canvas-based processor for real-time enhancement
          const canvas = document.createElement("canvas")
          const ctx = canvas.getContext("2d")
          
          if (ctx && "processVideoBuffer" in this.localTracks.videoTrack) {
            // Process video frames before encoding
            const originalProcess = (this.localTracks.videoTrack as any).processVideoBuffer
            
            // @ts-ignore
            this.localTracks.videoTrack.processVideoBuffer = async (sourceBuffer: ImageData) => {
              // Apply enhancements
              const enhanced = processVideoFrame(sourceBuffer, {
                brightness: 0.15, // Brighten by 15%
                contrast: 0.2, // Increase contrast by 20%
                saturation: 0.1, // Slight saturation boost
                skinToneBoost: 0.3, // Brighten skin tones by 30%
              })
              
              // Call original processor if it exists
              if (originalProcess) {
                return await originalProcess(enhanced)
              }
              return enhanced
            }
          }
        } catch (fallbackError) {
          console.warn("Failed to apply video enhancements:", fallbackError)
        }
      }
    }
    
    this.emit("localUserChanged", this.localTracks)
  }

  async publish() {
    if (this.localTracks.videoTrack && this.localTracks.audioTrack) {
      await this.client.publish([this.localTracks.videoTrack, this.localTracks.audioTrack])
    } else {
      const msg = "videoTrack or audioTrack is undefined"
      throw new Error(msg)
    }
  }

  async createScreenTrack() {
    try {
      this.screenTrack = await AgoraRTC.createScreenVideoTrack(
        {
          // Use high-quality encoder configuration for screen sharing (1080p)
          encoderConfig: "1080p_1", // 1920x1080, 30fps, ~2220kbps
        },
        "auto"
      )
      
      // Optionally enhance screen share quality with custom bitrate
      if (this.screenTrack && "setEncoderConfiguration" in this.screenTrack) {
        try {
          await this.screenTrack.setEncoderConfiguration({
            width: 1920,
            height: 1080,
            frameRate: 30,
            bitrateMax: 3000, // Higher bitrate for screen content
            bitrateMin: 1000,
          })
        } catch (error) {
          console.warn("Failed to set custom screen encoder configuration, using default:", error)
        }
      }
      
      this.screenTrack.on("track-ended", () => {
        this.stopScreenShare()
      })
      return this.screenTrack
    } catch (error) {
      console.error("Failed to create screen track:", error)
      throw error
    }
  }

  async startScreenShare() {
    if (!this._channel || !this._userId) {
      throw new Error("Must join channel before starting screen share")
    }

    // Create separate client for screen sharing
    if (!this.screenClient) {
      this.screenClient = AgoraRTC.createClient({ mode: "rtc", codec: "h264" })
    }

    // Join screen client to channel if not already joined
    if (!this._screenClientJoined) {
      const screenUserId = typeof this._userId === "number" 
        ? this._userId + 1000000 
        : `${this._userId}_screen`
      const token = await apiGetAgoraToken({ channel: this._channel, uid: screenUserId })
      await this.screenClient.join(appId, this._channel, token, screenUserId)
      this._screenClientJoined = true
    }

    // Create screen track if not exists
    if (!this.screenTrack) {
      await this.createScreenTrack()
    }

    if (this.screenTrack && this.screenClient) {
      // Keep camera track published so remote users can see it in participants list
      // Only publish screen track using screen client
      await this.screenClient.publish(this.screenTrack)
      this.emit("localUserChanged", {
        ...this.localTracks,
        screenTrack: this.screenTrack,
      })
    }
  }

  async stopScreenShare() {
    if (this.screenTrack && this.screenClient) {
      // Unpublish screen track from screen client
      await this.screenClient.unpublish(this.screenTrack)
      this.screenTrack.close()
      this.screenTrack = undefined
      
      // Leave screen client
      if (this._screenClientJoined) {
        await this.screenClient.leave()
        this._screenClientJoined = false
      }
      
      // Clean up screen client
      this.screenClient = undefined

      // Camera track remains published (it was never unpublished)
      // No need to republish it
      
      this.emit("localUserChanged", {
        ...this.localTracks,
        screenTrack: undefined,
      })
    }
  }

  async destroy() {
    this.localTracks?.audioTrack?.close()
    this.localTracks?.videoTrack?.close()
    this.screenTrack?.close()
    
    // Clean up screen client
    if (this._screenClientJoined && this.screenClient) {
      await this.screenClient.leave()
      this._screenClientJoined = false
    }
    this.screenClient = undefined
    
    if (this._joined) {
      await this.client?.leave()
    }
    this._resetData()
  }

  // ----------- public methods ------------
  
  /**
   * Apply or update video enhancement settings (brightness, contrast, skin tone)
   * @param enabled - Enable or disable video enhancement
   * @param options - Enhancement options
   */
  async setVideoEnhancement(enabled: boolean = true, options?: {
    lighteningLevel?: number // 0.0-1.0, default: 0.7 - brightens the overall image and skin
    lighteningContrastLevel?: number // 0-2, default: 1 - enhances contrast (0: low, 1: normal, 2: high)
    smoothnessLevel?: number // 0.0-1.0, default: 0.5 - smooths skin texture
    rednessLevel?: number // 0.0-1.0, default: 0.1 - adds warmth to skin tone
  }) {
    if (!this.localTracks.videoTrack) {
      console.warn("Video track not available for enhancement")
      return
    }

    try {
      if ("setBeautyEffect" in this.localTracks.videoTrack) {
        // @ts-ignore - setBeautyEffect is available in Agora SDK
        await this.localTracks.videoTrack.setBeautyEffect(enabled, {
          lighteningContrastLevel: options?.lighteningContrastLevel ?? 1,
          lighteningLevel: options?.lighteningLevel ?? 0.7,
          smoothnessLevel: options?.smoothnessLevel ?? 0.5,
          rednessLevel: options?.rednessLevel ?? 0.1,
        })
        console.log("Video enhancement", enabled ? "enabled" : "disabled")
      } else {
        console.warn("Beauty effect not available in this SDK version")
      }
    } catch (error) {
      console.error("Failed to set video enhancement:", error)
    }
  }

  // -------------- private methods --------------
  /**
   * Check if a UID is a screen client UID and extract the original user ID
   */
  private _extractOriginalUserId(screenUserId: UID): { isScreen: boolean; originalUserId: UID | null } {
    if (typeof screenUserId === "number") {
      // Check if it's a screen client UID (originalUserId + 1000000)
      if (screenUserId >= 1000000 && screenUserId < 2000000) {
        return {
          isScreen: true,
          originalUserId: screenUserId - 1000000,
        }
      }
    } else if (typeof screenUserId === "string") {
      // Check if it ends with "_screen"
      if (screenUserId.endsWith("_screen")) {
        return {
          isScreen: true,
          originalUserId: screenUserId.replace("_screen", ""),
        }
      }
    }
    return {
      isScreen: false,
      originalUserId: null,
    }
  }

  _listenRtcEvents() {
    this.client.on("network-quality", (quality) => {
      this.emit("networkQuality", quality)
    })
    this.client.on("user-published", async (user, mediaType) => {
      await this.client.subscribe(user, mediaType)
      
      // Check if this is a screen client publishing
      const { isScreen, originalUserId } = this._extractOriginalUserId(user.uid)
      
      if (isScreen && originalUserId && mediaType === "video") {
        // This is a screen share from a remote user - map to original user's screenTrack
        this.emit("remoteUserChanged", {
          userId: originalUserId,
          screenTrack: user.videoTrack || undefined,
        })
      } else if (!isScreen) {
        // Regular user publishing
        // Get tracks after subscription - they should be available now
        const audioTrack = user.audioTrack
        const videoTrack = user.videoTrack
        
        // Play audio track if available
        if (mediaType === "audio" && audioTrack) {
          console.log(`[RTC] Playing remote audio for user ${user.uid}`)
          this._playAudio(audioTrack)
        }
        
        // Emit remote user changed with tracks
        this.emit("remoteUserChanged", {
          userId: user.uid,
          audioTrack: audioTrack,
          videoTrack: videoTrack,
        })
      }
    })
    this.client.on("user-unpublished", async (user, mediaType) => {
      await this.client.unsubscribe(user, mediaType)
      
      // Check if this is a screen client unpublishing
      const { isScreen, originalUserId } = this._extractOriginalUserId(user.uid)
      
      if (isScreen && originalUserId && mediaType === "video") {
        // Screen share stopped - clear screenTrack for original user
        this.emit("remoteUserChanged", {
          userId: originalUserId,
          screenTrack: undefined,
        })
      } else if (!isScreen) {
        // Regular user unpublishing
        // Get current tracks after unsubscribe
        const audioTrack = user.audioTrack || undefined
        const videoTrack = user.videoTrack || undefined
        
        // Stop audio if it was unpublished
        if (mediaType === "audio" && audioTrack?.isPlaying) {
          try {
            audioTrack.stop()
          } catch (error) {
            console.error("[RTC] Error stopping audio:", error)
          }
        }
        
        this.emit("remoteUserChanged", {
          userId: user.uid,
          audioTrack: mediaType === "audio" ? undefined : audioTrack,
          videoTrack: mediaType === "video" ? undefined : videoTrack,
        })
      }
    })
    // Removed stream-message listener - no longer needed since we're using Web Speech API
    // The parser now receives data directly from the STT manager
    // this.client.on("stream-message", (uid: UID, stream: any) => {
    //   parser.praseData(stream)
    // })
  }

  _playAudio(audioTrack: IMicrophoneAudioTrack | IRemoteAudioTrack | undefined) {
    if (audioTrack) {
      try {
        if (!audioTrack.isPlaying) {
          console.log("[RTC] Starting audio playback")
          audioTrack.play()
        } else {
          console.log("[RTC] Audio track is already playing")
        }
      } catch (error) {
        console.error("[RTC] Error playing audio track:", error)
      }
    } else {
      console.warn("[RTC] Audio track is undefined, cannot play")
    }
  }

  _listenParserStreamEvent() {
    parser.on("textstreamReceived", (textstream) => {
      this.emit("textstreamReceived", textstream)
    })
  }

  _resetData() {
    this.localTracks = {}
    this.screenTrack = undefined
    this._joined = false
    this._screenClientJoined = false
    this._channel = undefined
    this._userId = undefined
  }
}
