import {
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IRemoteAudioTrack,
  IRemoteVideoTrack,
  VideoPlayerConfig,
} from "agora-rtc-sdk-ng"
import { useRef, useState, useLayoutEffect, forwardRef, useEffect, useMemo } from "react"
import { useSelector } from "react-redux"
import { RootState } from "@/store"

import styles from "./index.module.scss"

interface StreamPlayerProps {
  videoTrack?: ICameraVideoTrack | IRemoteVideoTrack
  audioTrack?: IMicrophoneAudioTrack | IRemoteAudioTrack
  screenTrack?: IRemoteVideoTrack
  style?: React.CSSProperties
  fit?: "cover" | "contain" | "fill"
  onClick?: () => void
}

export const RemoteStreamPlayer = forwardRef((props: StreamPlayerProps, ref) => {
  const { videoTrack, audioTrack, screenTrack, style = {}, fit = "cover", onClick = () => {} } = props

  const vidDiv = useRef(null)

  // Prioritize screenTrack over videoTrack when screen sharing
  const activeTrack = screenTrack || videoTrack

  useLayoutEffect(() => {
    const config = { fit } as VideoPlayerConfig
    if (screenTrack) {
      // Screen track is playing
      if (!screenTrack.isPlaying) {
        screenTrack.play(vidDiv.current!, config)
      }
      // Stop video track if screen sharing
      if (videoTrack?.isPlaying) {
        videoTrack.stop()
      }
    } else if (activeTrack && !activeTrack.isPlaying) {
      activeTrack.play(vidDiv.current!, config)
    }

    return () => {
      activeTrack?.stop()
    }
  }, [activeTrack, screenTrack, videoTrack, fit])

  useLayoutEffect(() => {
    if (!audioTrack?.isPlaying) {
      audioTrack?.play()
    }
  }, [audioTrack])

  return <div className={styles.streamPlayer} style={style} ref={vidDiv} onClick={onClick}></div>
})
