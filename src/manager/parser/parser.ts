import { ITextstream, ParserEvents, ITranslationItem } from "./types"
import { AGEventEmitter } from "../events"
import protoRoot from "@/protobuf/SttMessage.js"

export class Parser extends AGEventEmitter<ParserEvents> {
  constructor() {
    super()
  }

  praseData(data: any) {
    let textstream: ITextstream | null = null

    // Check if data is already in ITextstream format (from Web Speech API)
    if (data && typeof data === "object" && "dataType" in data && "uid" in data) {
      textstream = data as ITextstream
    } else {
      // Try to decode as Agora protobuf format (for backwards compatibility)
      try {
        // @ts-ignore
        textstream = protoRoot.Agora.SpeechToText.lookup("Text").decode(data) as ITextstream
      } catch (error) {
        console.warn("Failed to parse data as protobuf:", error)
        return
      }
    }

    if (!textstream) {
      return console.warn("Parse data failed.")
    }
    console.log("[test] textstream praseData", textstream)
    this.emit("textstreamReceived", textstream)
  }
}

export const parser = new Parser()
