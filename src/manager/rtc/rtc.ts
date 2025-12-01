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
    this.client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" })
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
    const tracks = await AgoraRTC.createMicrophoneAndCameraTracks({
      AGC: false,
    })
    this.localTracks.audioTrack = tracks[0]
    this.localTracks.videoTrack = tracks[1]
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
          encoderConfig: "1080p_1",
        },
        "auto"
      )
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
      this.screenClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" })
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
        if (mediaType === "audio") {
          this._playAudio(user.audioTrack)
        }
        this.emit("remoteUserChanged", {
          userId: user.uid,
          audioTrack: user.audioTrack,
          videoTrack: user.videoTrack,
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
        this.emit("remoteUserChanged", {
          userId: user.uid,
          audioTrack: user.audioTrack,
          videoTrack: user.videoTrack,
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
    if (audioTrack && !audioTrack.isPlaying) {
      audioTrack.play()
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
