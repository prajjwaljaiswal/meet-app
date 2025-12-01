import { IChatMessage, ITextstream } from "@/types"

export interface ChatEvents {
  chatMessageReceived: (message: IChatMessage) => void
  transcriptionReceived: (data: { userId: string; userName: string; textstream: ITextstream }) => void
  connected: () => void
  disconnected: () => void
  error: (error: Error) => void
}

