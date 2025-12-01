# Agora RTT Web Demo



## Prepare

* node version 18+ , 20+



## Config

See [Get Started with Agora](https://docs.agora.io/en/video-calling/reference/manage-agora-account?platform=web#get-started-with-agora) to learn how to get an App ID and App Certificate. (Certificate must be turned on)



Activate RTM permissions in the console

<img src=https://fullapp.oss-cn-beijing.aliyuncs.com/pic/rtm/39351715138175_.pic.jpg width=80% />





Contact technical support to activate RTT permissions

- You can get help from intelligent customer service or contact sales staff [Agora support](https://agora-ticket.agora.io/) 
- Send an email to  [support@agora.io](mailto:support@agora.io)  for consultation



Find `.env`  file  and fill in the following parameters correctly

```bash
VITE_AGORA_APP_ID=<YOUR_APP_ID>
VITE_AGORA_APP_CERTIFICATE=<YOUR_APP_CERTIFICATE>
VITE_SOCKET_IO_URL=http://localhost:5000  # Optional: Socket.IO server URL (defaults to current origin)
```



## Install

In the project root path run the following command to install dependencies.

```bash
npm install 
```

### Chat Server Setup (Socket.IO)

The chat functionality requires a separate Socket.IO server. To set it up:

1. Navigate to the server directory:
```bash
cd server
npm install
```

2. (Optional) Create a `.env` file in the `server` directory:
```bash
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

3. Start the chat server:
```bash
npm start
# or for development with auto-reload:
npm run dev
```

For more details, see [server/README.md](./server/README.md).





## Dev

Use the following command to run the sample project.

```bash
npm run dev
```



## Build

Use the following command to build the sample project.

```bash
npm run build
```
