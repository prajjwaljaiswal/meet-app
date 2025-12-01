# Socket.IO Chat Server Setup Guide

## Quick Start

1. **Install dependencies:**
   ```bash
   cd server
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

   On Windows, you can also use:
   ```bash
   start.bat
   ```

   On Linux/Mac:
   ```bash
   chmod +x start.sh
   ./start.sh
   ```

3. **Configure the frontend:**
   
   Add to your `.env` file in the project root:
   ```
   VITE_SOCKET_IO_URL=http://localhost:5000
   ```

   Or the chat manager will default to `window.location.origin`.

## Testing the Connection

1. **Start the server** (should see):
   ```
   [Server] Socket.IO server running on port 5000
   [Server] CORS origin: *
   [Server] Waiting for connections...
   ```

2. **Start the frontend** and navigate to the home page

3. **Open browser console** - you should see:
   ```
   [ChatManager] Connecting to Socket.IO server: http://localhost:5000
   [ChatManager] Connected to Socket.IO server
   [ChatManager] Successfully joined channel: {...}
   ```

4. **Server console** should show:
   ```
   [Server] Client connected: <socket-id>
   [Server] User <userName> (<userId>) joined channel: <channel>
   ```

## Testing Chat Messages

1. Open the chat panel in the UI
2. Type a message and send it
3. Check browser console for:
   ```
   [ChatManager] Sending chat message: {...}
   [ChatManager] Received chat message: {...}
   ```

4. Check server console for:
   ```
   [Server] Message from <userName> (<userId>) in channel <channel>: <message>...
   ```

5. Open another browser window/tab with the same channel - messages should appear in both

## Troubleshooting

### Connection Issues

**Problem:** Client can't connect to server

**Solutions:**
- Make sure the server is running on port 5000
- Check that `VITE_SOCKET_IO_URL` matches the server URL
- Verify CORS settings if connecting from a different origin
- Check firewall settings

**Problem:** "Connection timeout" error

**Solutions:**
- Verify the server is running
- Check the server URL is correct
- Ensure no firewall is blocking the connection

### Message Issues

**Problem:** Messages not appearing

**Solutions:**
- Check browser console for errors
- Verify both client and server logs show message events
- Ensure both users are in the same channel
- Check that the chat manager is connected (`window.chatManager.isConnected`)

**Problem:** Duplicate messages

**Solutions:**
- This should be handled automatically by duplicate detection
- Check that message IDs are unique
- Verify the reducer's duplicate check logic

## Environment Variables

You can configure the server using environment variables:

```bash
PORT=5000                    # Server port (default: 5000)
CORS_ORIGIN=http://localhost:5173  # Allowed CORS origins (default: *)
```

To use multiple origins:
```bash
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

## Architecture

### Server Events

**Client → Server:**
- `joinChannel` - Join a chat channel/room
- `chatMessage` - Send a chat message
- `leaveChannel` - Leave a channel

**Server → Client:**
- `chatMessage` - Receive a chat message
- `channelJoined` - Confirmation of joining a channel
- `userJoined` - Notification when another user joins
- `userLeft` - Notification when a user leaves
- `error` - Error notifications

### Message Flow

1. User types message and clicks send
2. Client creates optimistic message (immediate UI update)
3. Client sends message via Socket.IO
4. Server validates and broadcasts to all users in channel
5. Client receives message from server
6. Reducer checks for duplicates before adding to state
7. UI updates with the message (replacing temp message if needed)

## Production Deployment

For production, consider:

1. **Use environment variables** for configuration
2. **Enable HTTPS/WSS** for secure connections
3. **Set proper CORS origins** (not "*")
4. **Add authentication** if needed
5. **Use a reverse proxy** (nginx, etc.)
6. **Enable logging** and monitoring
7. **Scale horizontally** using Redis adapter for Socket.IO

Example production start:
```bash
PORT=5000 CORS_ORIGIN=https://yourdomain.com npm start
```

