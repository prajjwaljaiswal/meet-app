import { useEffect, useState, useRef, useMemo } from "react"
import { getElementScrollY, getCaptionScrollPX } from "@/common"
import CaptionItem from "./caption-item"
import { IUICaptionData } from "@/types"
import { useSelector } from "react-redux"
import { RootState } from "@/store"

import styles from "./index.module.scss"

interface ICaptionProps {
  speed?: number
  visible?: boolean
}

const Caption = (props: ICaptionProps) => {
  const { visible } = props
  const captionLanguages = useSelector((state: RootState) => state.global.captionLanguages)
  const captionRef = useRef<HTMLDivElement>(null)
  const subtitles = useSelector((state: RootState) => state.global.sttSubtitles)

  const captionList: IUICaptionData[] = useMemo(() => {
    // Show ALL final transcriptions, each on a new line
    // Also show latest interim per user (will be replaced when final comes)
    const listWithTimestamps: Array<{ data: IUICaptionData; timestamp: number }> = []
    const latestInterimPerUser = new Map<string | number, { el: typeof subtitles[0]; timestamp: number }>()
    
    // Process all subtitles - collect all final transcriptions
    subtitles.forEach((el) => {
      if (el.isFinal) {
        // Final transcription - add it to the list (don't filter by user, show all)
        const captionData: IUICaptionData = {
          userName: el.username,
          translations: [],
          content: "",
        }
        if (captionLanguages.includes("live")) {
          captionData.content = el.text
        }
        el.translations?.forEach((tran) => {
          const tranItem = { lang: tran.lang, text: tran.text }
          if (captionLanguages.includes(tran.lang)) {
            captionData.translations?.push(tranItem)
          }
        })
        if (captionData.content || captionData.translations?.length) {
          listWithTimestamps.push({
            data: captionData,
            timestamp: el.textTs,
          })
        }
        // Clear interim for this user since we have a final
        latestInterimPerUser.delete(el.uid)
      } else {
        // Interim transcription - keep track of latest per user
        const existing = latestInterimPerUser.get(el.uid)
        if (!existing || el.textTs > existing.timestamp) {
          latestInterimPerUser.set(el.uid, { el, timestamp: el.textTs })
        }
      }
    })
    
    // Add latest interim transcriptions (for users without final yet)
    latestInterimPerUser.forEach(({ el, timestamp }) => {
      const captionData: IUICaptionData = {
        userName: el.username,
        translations: [],
        content: "",
      }
      if (captionLanguages.includes("live")) {
        captionData.content = el.text
      }
      el.translations?.forEach((tran) => {
        const tranItem = { lang: tran.lang, text: tran.text }
        if (captionLanguages.includes(tran.lang)) {
          captionData.translations?.push(tranItem)
        }
      })
      if (captionData.content || captionData.translations?.length) {
        listWithTimestamps.push({
          data: captionData,
          timestamp: timestamp,
        })
      }
    })
    
    // Sort by timestamp (oldest first) for natural reading order
    listWithTimestamps.sort((a, b) => a.timestamp - b.timestamp)
    
    // Return just the data array - each item will be on a new line
    return listWithTimestamps.map((item) => item.data)
  }, [captionLanguages, subtitles])

  const animate = () => {
    if (!captionRef.current) {
      return
    }
    const curScrollY = getElementScrollY(captionRef.current)
    if (curScrollY > 0) {
      // TODO: use transformY instead of scrollTop
      const curScrollTop = captionRef.current.scrollTop ?? 0
      const val = getCaptionScrollPX(curScrollY)
      captionRef.current.scrollTop = curScrollTop + val
    }
  }

  useEffect(() => {
    const id = setInterval(() => {
      animate()
    }, 35)

    return () => {
      clearInterval(id)
    }
  }, [captionList])

  return (
    <div className={`${styles.caption} ${!visible ? "hidden" : ""}`} ref={captionRef}>
      {captionList.map((item, index) => (
        <CaptionItem key={index} data={item}></CaptionItem>
      ))}
    </div>
  )
}

export default Caption
