/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

import { RtcManager, RtmManager, SttManager, ChatManager } from "@/manager"

declare global {
  interface Window {
    rtcManager: RtcManager
    rtmManager: RtmManager
    chatManager: ChatManager
    sttManager: SttManager
  }
}
