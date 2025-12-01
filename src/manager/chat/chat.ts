import { io, Socket } from "socket.io-client"
import { AGEventEmitter } from "../events"
import { ChatEvents } from "./types"
import { IChatMessage, ITextstream } from "@/types"

export class ChatManager extends AGEventEmitter<ChatEvents> {
  private socket: Socket | null = null
  private channel: string = ""
  private userId: string = ""
  private userName: string = ""
  private connected: boolean = false

  constructor() {
    super()
  }

  async join({
    channel,
    userId,
    userName,
    serverUrl,
  }: {
    channel: string
    userId: string
    userName: string
    serverUrl?: string
  }) {
    if (this.connected && this.socket) {
      console.log("[ChatManager] Already connected, skipping join")
      return
    }

    this.channel = channel
    this.userId = userId
    this.userName = userName

    // Default to current origin if serverUrl not provided
    const url = "https://videocallbackend.24livehost.com:5200"

    console.log("[ChatManager] Connecting to Socket.IO server:", url)

    this.socket = io(url, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })

    // Handle connection events
    this.socket.on("connect", () => {
      console.log("[ChatManager] Connected to Socket.IO server")
      this.connected = true

      // Join the channel room
      this.socket?.emit("joinChannel", {
        channel,
        userId,
        userName,
      })

      this.emit("connected")
    })

    this.socket.on("disconnect", () => {
      console.log("[ChatManager] Disconnected from Socket.IO server")
      this.connected = false
      this.emit("disconnected")
    })

    this.socket.on("connect_error", (error) => {
      console.error("[ChatManager] Connection error:", error)
      this.emit("error", error)
    })

    // Listen for chat messages
    this.socket.on("chatMessage", (data: any) => {
      console.log("[ChatManager] Received chat message:", data)

      try {
        // Handle message from server - could be in different formats
        const chatMessage: IChatMessage = {
          id: data.id || `${data.userId}-${data.timestamp || Date.now()}`,
          userId: data.userId || "",
          userName: data.userName || "",
          content: data.content || "",
          timestamp: data.timestamp || Date.now(),
        }

        // Emit all messages (server broadcasts to all users including sender)
        // The UI will handle duplicate detection if needed
        this.emit("chatMessageReceived", chatMessage)
      } catch (error) {
        console.error("[ChatManager] Error processing chat message:", error)
        this.emit("error", error as Error)
      }
    })

    // Listen for transcription messages
    this.socket.on("transcription", (data: any) => {
      console.log("[ChatManager] Received transcription:", data)

      try {
        // Don't emit our own transcriptions (they're already handled locally)
        // Compare as strings to handle number/string type differences
        const receivedUserId = String(data.userId || "")
        const currentUserId = String(this.userId || "")

        if (data.userId && receivedUserId !== currentUserId && data.textstream) {
          console.log(
            `[ChatManager] Processing remote transcription from ${data.userName} (${data.userId})`,
          )
          this.emit("transcriptionReceived", {
            userId: data.userId,
            userName: data.userName || "",
            textstream: data.textstream,
          })
        } else {
          console.log(`[ChatManager] Ignoring own transcription from ${this.userId}`)
        }
      } catch (error) {
        console.error("[ChatManager] Error processing transcription:", error)
        this.emit("error", error as Error)
      }
    })

    // Listen for channel joined confirmation
    this.socket.on("channelJoined", (data: any) => {
      console.log("[ChatManager] Successfully joined channel:", data)
    })

    // Listen for errors from server
    this.socket.on("error", (error: any) => {
      console.error("[ChatManager] Server error:", error)
      this.emit("error", new Error(error.message || "Server error"))
    })

    // Wait for connection or timeout
    // Note: We don't reject on connection errors to allow reconnection attempts
    return new Promise<void>((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("Failed to initialize socket"))
        return
      }

      // If already connected, resolve immediately
      if (this.socket.connected) {
        resolve()
        return
      }

      let resolved = false
      const timeoutId = setTimeout(() => {
        if (!resolved && !this.connected) {
          resolved = true
          // Don't reject - let reconnection handle it
          // Just resolve and let the reconnection continue in background
          console.warn("[ChatManager] Connection timeout, but allowing reconnection attempts")
          resolve()
        }
      }, 10000)

      // Handle successful connection
      const connectHandler = () => {
        if (!resolved) {
          resolved = true
          clearTimeout(timeoutId)
          resolve()
        }
      }

      // Handle connection errors (don't reject, allow reconnection)
      const errorHandler = (error: Error) => {
        console.error("[ChatManager] Connection error during join:", error)
        // Don't reject immediately - allow reconnection attempts
        // Only reject if we haven't resolved within timeout
        if (!resolved) {
          clearTimeout(timeoutId)
          // Wait a bit longer for reconnection
          setTimeout(() => {
            if (!resolved && !this.connected) {
              resolved = true
              resolve() // Still resolve, reconnection will continue
            }
          }, 2000)
        }
      }

      this.socket.once("connect", connectHandler)
      this.socket.once("connect_error", errorHandler)
    })
  }

  async sendChatMessage(content: string): Promise<void> {
    if (!this.connected || !this.socket) {
      throw new Error("Not connected to chat server. Please join a channel first.")
    }

    if (!this.socket.connected) {
      throw new Error("Socket is not connected. Please wait for connection.")
    }

    if (!content.trim()) {
      throw new Error("Message content cannot be empty")
    }

    const timestamp = Date.now()
    const messageId = `${this.userId}-${timestamp}-${Math.random().toString(36).substring(7)}`

    const message: IChatMessage = {
      id: messageId,
      userId: this.userId,
      userName: this.userName,
      content: content.trim(),
      timestamp,
    }

    console.log("[ChatManager] Sending chat message:", message)

    this.socket.emit("chatMessage", {
      channel: this.channel,
      ...message,
    })
  }

  async sendTranscription(textstream: ITextstream): Promise<void> {
    if (!this.connected || !this.socket) {
      console.warn("[ChatManager] Cannot send transcription: not connected")
      return
    }

    if (!this.socket.connected) {
      console.warn("[ChatManager] Cannot send transcription: socket not connected")
      return
    }

    try {
      const transcriptionData = {
        channel: this.channel,
        userId: String(this.userId), // Ensure userId is a string for consistency
        userName: this.userName,
        textstream: textstream,
      }

      console.log("[ChatManager] Sending transcription:", transcriptionData)

      this.socket.emit("transcription", transcriptionData)
    } catch (error) {
      console.error("[ChatManager] Failed to send transcription:", error)
    }
  }

  async destroy() {
    if (this.socket) {
      console.log("[ChatManager] Disconnecting from Socket.IO server")
      this.socket.emit("leaveChannel", {
        channel: this.channel,
        userId: this.userId,
      })
      this.socket.disconnect()
      this.socket = null
    }
    this.connected = false
    this.channel = ""
    this.userId = ""
    this.userName = ""
    this.removeAllEventListeners()
  }

  get isConnected(): boolean {
    return this.connected && this.socket?.connected === true
  }
}
