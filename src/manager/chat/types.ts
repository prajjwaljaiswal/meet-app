import { IChatMessage } from "@/types"

export interface ChatEvents {
  chatMessageReceived: (message: IChatMessage) => void
  connected: () => void
  disconnected: () => void
  error: (error: Error) => void
}

