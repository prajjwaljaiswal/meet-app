import {
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IRemoteAudioTrack,
  IRemoteVideoTrack,
  ILocalScreenVideoTrack,
  VideoPlayerConfig,
} from "agora-rtc-sdk-ng"
import { useRef, useState, useLayoutEffect, forwardRef, useEffect, useMemo } from "react"
import { useSelector } from "react-redux"
import { RootState } from "@/store"

import styles from "./index.module.scss"

interface StreamPlayerProps {
  videoTrack?: ICameraVideoTrack
  screenTrack?: ILocalScreenVideoTrack
  audioTrack?: IMicrophoneAudioTrack
  style?: React.CSSProperties
  fit?: "cover" | "contain" | "fill"
  onClick?: () => void
}

export const LocalStreamPlayer = forwardRef((props: StreamPlayerProps, ref) => {
  const { videoTrack, screenTrack, audioTrack, style = {}, fit = "cover", onClick = () => {} } = props
  const localVideoMute = useSelector((state: RootState) => state.global.localVideoMute)
  const isScreenSharing = useSelector((state: RootState) => state.global.isScreenSharing)
  const vidDiv = useRef(null)

  // Prioritize screenTrack over videoTrack when screen sharing
  const activeTrack = screenTrack || videoTrack

  useLayoutEffect(() => {
    const config = { fit } as VideoPlayerConfig
    if (screenTrack) {
      // Screen track is always playing when active
      if (!screenTrack.isPlaying) {
        screenTrack.play(vidDiv.current!, config)
      }
      // Stop video track if screen sharing
      if (videoTrack?.isPlaying) {
        videoTrack.stop()
      }
    } else if (localVideoMute) {
      activeTrack?.stop()
    } else {
      if (activeTrack && !activeTrack.isPlaying) {
        activeTrack.play(vidDiv.current!, config)
      }
    }

    return () => {
      activeTrack?.stop()
    }
  }, [activeTrack, screenTrack, videoTrack, fit, localVideoMute, isScreenSharing])

  // local audio track need not to be played
  // useLayoutEffect(() => {}, [audioTrack, localAudioMute])

  return <div className={styles.streamPlayer} style={style} ref={vidDiv} onClick={onClick}></div>
})
