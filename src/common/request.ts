import store from "@/store"
import { parseQuery } from "./utils"
import { IRequestLanguages } from "@/types"

const MODE = import.meta.env.MODE
let gatewayAddress = "https://api.agora.io"
const BASE_URL = "https://service.agora.io/toolbox-overseas"

// ---------------------------------------
const appId = import.meta.env.VITE_AGORA_APP_ID
const appCertificate = import.meta.env.VITE_AGORA_APP_CERTIFICATE
const SUB_BOT_UID = "1000"
const PUB_BOT_UID = "2000"

let agoraToken = ""
let genTokenTime = 0

export async function apiGetAgoraToken(config: { uid: string | number; channel: string }) {
  if (!appCertificate) {
    return null
  }
  const { uid, channel } = config
  const url = `${BASE_URL}/v2/token/generate`
  const data = {
    appId,
    appCertificate,
    channelName: channel,
    expire: 7200,
    src: "web",
    types: [1, 2],
    uid: uid + "",
  }

  console.log("data apiGetAgoraToken*****", data)
  let resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  resp = (await resp.json()) || {}
  console.log("respToken apiGetAgoraToken", resp)
  // @ts-ignore
  return resp?.data?.token || ""
}

const genAuthorization = async (config: { uid: string | number; channel: string }) => {
  console.log("genAuthorization", config)
  if (agoraToken) {
    const curTime = new Date().getTime()
    if (curTime - genTokenTime < 1000 * 60 * 60) {
      return `agora token="${agoraToken}"`
    }
  }
  agoraToken = await apiGetAgoraToken(config)
  genTokenTime = new Date().getTime()
  return `agora token="${agoraToken}"`
}

// --------------- stt ----------------
// NOTE: Agora STT API functions have been removed.
// The application now uses Web Speech API for transcription.
// These functions are kept for reference but are no longer used.
//
// Removed functions:
// - apiSTTAcquireToken
// - apiSTTStartTranscription
// - apiSTTStopTranscription
// - apiSTTQueryTranscription
// - apiSTTUpdateTranscription

// --------------- gpt ----------------
export const apiAiAnalysis = async (options: { system: string; userContent: string }) => {
  const url = import.meta.env.VITE_AGORA_GPT_URL
  if (!url) {
    throw new Error("VITE_AGORA_GPT_URL is not defined in env")
  }
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(options),
  })
  return await res.json()
}
