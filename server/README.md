# Socket.IO Chat Server

This is the backend server for the Agora RTT Demo chat functionality using Socket.IO.

## Features

- Real-time chat messaging
- Channel/room support
- User join/leave notifications
- Automatic cleanup on disconnect
- CORS support for cross-origin requests

## Installation

```bash
cd server
npm install
```

## Configuration

The server can be configured using environment variables:

- `PORT` - Server port (default: 3000)
- `CORS_ORIGIN` - Allowed CORS origins (default: "*" for all origins)
  - For multiple origins, use comma-separated values: `http://localhost:5173,http://localhost:3000`
  - For single origin: `http://localhost:5173`

## Running the Server

### Development Mode (with auto-reload)

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

Or with environment variables:

```bash
PORT=3000 CORS_ORIGIN=http://localhost:5173 npm start
```

## API Events

### Client → Server Events

#### `joinChannel`
Join a chat channel/room.

```javascript
socket.emit("joinChannel", {
  channel: "channel-name",
  userId: "user-123",
  userName: "John Doe"
})
```

#### `chatMessage`
Send a chat message to the channel.

```javascript
socket.emit("chatMessage", {
  channel: "channel-name",
  userId: "user-123",
  userName: "John Doe",
  content: "Hello, world!",
  timestamp: 1234567890,
  id: "message-id"
})
```

#### `leaveChannel`
Leave a chat channel.

```javascript
socket.emit("leaveChannel", {
  channel: "channel-name",
  userId: "user-123"
})
```

### Server → Client Events

#### `chatMessage`
Receive a chat message from another user.

```javascript
socket.on("chatMessage", (message) => {
  console.log(message)
  // {
  //   id: "message-id",
  //   userId: "user-123",
  //   userName: "John Doe",
  //   content: "Hello, world!",
  //   timestamp: 1234567890,
  //   channel: "channel-name"
  // }
})
```

#### `channelJoined`
Confirmation that the client successfully joined a channel.

```javascript
socket.on("channelJoined", (data) => {
  console.log(data)
  // {
  //   channel: "channel-name",
  //   userId: "user-123",
  //   userName: "John Doe"
  // }
})
```

#### `userJoined`
Notification that another user joined the channel.

```javascript
socket.on("userJoined", (data) => {
  console.log(data)
  // {
  //   userId: "user-456",
  //   userName: "Jane Doe",
  //   channel: "channel-name"
  // }
})
```

#### `userLeft`
Notification that a user left the channel.

```javascript
socket.on("userLeft", (data) => {
  console.log(data)
  // {
  //   userId: "user-456",
  //   channel: "channel-name"
  // }
})
```

#### `error`
Error notification from the server.

```javascript
socket.on("error", (error) => {
  console.error(error)
  // {
  //   message: "Error message"
  // }
})
```

## Connecting from Frontend

Make sure to set the `VITE_SOCKET_IO_URL` environment variable in your frontend `.env` file:

```env
VITE_SOCKET_IO_URL=http://localhost:5000
```

Or the chat manager will default to `window.location.origin`.

## Example Usage

```javascript
import { io } from "socket.io-client"

const socket = io("http://localhost:3000")

socket.on("connect", () => {
  console.log("Connected to server")
  
  // Join a channel
  socket.emit("joinChannel", {
    channel: "my-channel",
    userId: "user-123",
    userName: "John Doe"
  })
})

socket.on("channelJoined", () => {
  // Send a message
  socket.emit("chatMessage", {
    channel: "my-channel",
    userId: "user-123",
    userName: "John Doe",
    content: "Hello, everyone!",
    timestamp: Date.now()
  })
})

socket.on("chatMessage", (message) => {
  console.log("Received message:", message.content)
})
```

## Notes

- The server automatically handles user disconnections and cleans up channel memberships
- Messages are broadcast to all users in the same channel
- The server validates required fields and sends error messages if validation fails
- Channel users are tracked per channel for potential future features (user list, etc.)

