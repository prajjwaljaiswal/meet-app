import { Server } from "socket.io"
import { createServer } from "https"
import fs from "fs"
import path from "path"

const PORT = process.env.PORT || 5200
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*"

// Create HTTPS server
const httpsServer = createServer({
  key: fs.readFileSync(path.join(__dirname, "cert.key")),
  cert: fs.readFileSync(path.join(__dirname, "STAR.24livehost.com 1.crt")),
})

// Initialize Socket.IO server with CORS configuration
const io = new Server(httpsServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
})

// Store active channels and their users
const channelUsers = new Map() // channel -> Set of userIds
const socketUsers = new Map() // socketId -> { userId, userName, channel }

io.on("connection", (socket) => {
  console.log(`[Server] Client connected: ${socket.id}`)

  // Handle join channel
  socket.on("joinChannel", (data) => {
    try {
      const { channel, userId, userName } = data

      if (!channel || !userId || !userName) {
        socket.emit("error", {
          message: "Missing required fields: channel, userId, userName",
        })
        return
      }

      // Leave previous channel if exists
      const previousData = socketUsers.get(socket.id)
      if (previousData && previousData.channel) {
        leaveChannel(socket, previousData.channel, previousData.userId)
      }

      // Join the channel room
      socket.join(channel)

      // Store user info
      socketUsers.set(socket.id, {
        userId,
        userName,
        channel,
      })

      // Add user to channel users set
      if (!channelUsers.has(channel)) {
        channelUsers.set(channel, new Set())
      }
      channelUsers.get(channel).add(userId)

      console.log(`[Server] User ${userName} (${userId}) joined channel: ${channel}`)

      // Notify others in the channel (optional - you can emit a userJoined event)
      socket.to(channel).emit("userJoined", {
        userId,
        userName,
        channel,
      })

      // Send confirmation back to the client
      socket.emit("channelJoined", {
        channel,
        userId,
        userName,
      })
    } catch (error) {
      console.error("[Server] Error in joinChannel:", error)
      socket.emit("error", {
        message: "Failed to join channel",
        error: error.message,
      })
    }
  })

  // Handle chat message
  socket.on("chatMessage", (data) => {
    try {
      const { channel, userId, userName, content, timestamp, id } = data

      // Get user info from socket
      const userData = socketUsers.get(socket.id)

      if (!userData) {
        socket.emit("error", {
          message: "You must join a channel first",
        })
        return
      }

      // Use data from socket if not provided in message
      const messageChannel = channel || userData.channel
      const messageUserId = userId || userData.userId
      const messageUserName = userName || userData.userName

      if (!content || !content.trim()) {
        socket.emit("error", {
          message: "Message content cannot be empty",
        })
        return
      }

      // Create message object
      const message = {
        id: id || `${messageUserId}-${timestamp || Date.now()}`,
        userId: messageUserId,
        userName: messageUserName,
        content: content.trim(),
        timestamp: timestamp || Date.now(),
        channel: messageChannel,
      }

      console.log(
        `[Server] Message from ${messageUserName} (${messageUserId}) in channel ${messageChannel}: ${message.content.substring(0, 50)}...`,
      )

      // Broadcast message to all users in the channel (including sender)
      // This allows the sender to see their own message and get the final message ID
      io.to(messageChannel).emit("chatMessage", message)
    } catch (error) {
      console.error("[Server] Error in chatMessage:", error)
      socket.emit("error", {
        message: "Failed to send message",
        error: error.message,
      })
    }
  })

  // Handle transcription message
  socket.on("transcription", (data) => {
    try {
      const { channel, userId, userName, textstream } = data

      // Get user info from socket
      const userData = socketUsers.get(socket.id)

      if (!userData) {
        socket.emit("error", {
          message: "You must join a channel first",
        })
        return
      }

      // Use data from socket if not provided in message
      const transcriptionChannel = channel || userData.channel
      const transcriptionUserId = userId || userData.userId
      const transcriptionUserName = userName || userData.userName

      if (!textstream) {
        socket.emit("error", {
          message: "Transcription textstream cannot be empty",
        })
        return
      }

      // Create transcription object
      const transcription = {
        userId: transcriptionUserId,
        userName: transcriptionUserName,
        textstream: textstream,
        channel: transcriptionChannel,
      }

      console.log(
        `[Server] Transcription from ${transcriptionUserName} (${transcriptionUserId}) in channel ${transcriptionChannel}`,
      )

      // Broadcast transcription to all users in the channel (excluding sender - they already have it locally)
      socket.to(transcriptionChannel).emit("transcription", transcription)
    } catch (error) {
      console.error("[Server] Error in transcription:", error)
      socket.emit("error", {
        message: "Failed to send transcription",
        error: error.message,
      })
    }
  })

  // Handle leave channel
  socket.on("leaveChannel", (data) => {
    try {
      const { channel, userId } = data
      const userData = socketUsers.get(socket.id)

      const leaveChannelName = channel || userData?.channel
      const leaveUserId = userId || userData?.userId

      if (leaveChannelName && leaveUserId) {
        leaveChannel(socket, leaveChannelName, leaveUserId)
      }
    } catch (error) {
      console.error("[Server] Error in leaveChannel:", error)
    }
  })

  // Handle disconnect
  socket.on("disconnect", (reason) => {
    console.log(`[Server] Client disconnected: ${socket.id}, reason: ${reason}`)

    const userData = socketUsers.get(socket.id)
    if (userData) {
      leaveChannel(socket, userData.channel, userData.userId)
      socketUsers.delete(socket.id)
    }
  })

  // Handle errors
  socket.on("error", (error) => {
    console.error(`[Server] Socket error for ${socket.id}:`, error)
  })
})

// Helper function to leave a channel
function leaveChannel(socket, channel, userId) {
  if (!channel || !userId) return

  socket.leave(channel)

  // Remove user from channel users set
  if (channelUsers.has(channel)) {
    channelUsers.get(channel).delete(userId)

    // Clean up empty channels
    if (channelUsers.get(channel).size === 0) {
      channelUsers.delete(channel)
    }

    // Notify others in the channel
    socket.to(channel).emit("userLeft", {
      userId,
      channel,
    })

    console.log(`[Server] User ${userId} left channel: ${channel}`)
  }
}

// Start server
httpsServer.listen(PORT, () => {
  console.log(`[Server] Socket.IO server running on port ${PORT}`)
  console.log(`[Server] CORS origin: ${CORS_ORIGIN}`)
  console.log(`[Server] Waiting for connections...`)
})

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("[Server] SIGTERM received, shutting down gracefully")
  httpsServer.close(() => {
    console.log("[Server] HTTP server closed")
    process.exit(0)
  })
})

process.on("SIGINT", () => {
  console.log("[Server] SIGINT received, shutting down gracefully")
  httpsServer.close(() => {
    console.log("[Server] HTTP server closed")
    process.exit(0)
  })
})
