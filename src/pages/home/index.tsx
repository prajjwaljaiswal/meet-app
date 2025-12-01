import { useMount, useMessage } from "@/common"
import { IUserInfo, IUserData, ILanguageSelect, ISttData, IChatMessage } from "@/types"
import {
  RtcManager,
  RtmManager,
  ChatManager,
  ISimpleUserInfo,
  IUserTracks,
  IRtcUser,
  SttManager,
  ITextstream,
} from "@/manager"
import Header from "../../components/header"
import Footer from "../../components/footer"
import CenterArea from "../../components/center-area"
import UserList from "../../components/user-list"
import Caption from "../../components/caption"
import Menu from "../../components/menu"
import { RootState } from "@/store"
import {
  setLocalAudioMute,
  setLocalVideoMute,
  setIsScreenSharing,
  setLanguageSelect,
  reset,
  setCaptionShow,
  addMessage,
  addChatMessage,
  updateSubtitles,
  setSttData,
  setSubtitles,
  setRecordLanguageSelect,
} from "@/store/reducers/global"
import { useSelector, useDispatch } from "react-redux"
import store from "@/store"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"

import styles from "./index.module.scss"

const rtcManager = new RtcManager()
const rtmManager = new RtmManager()
const chatManager = new ChatManager()
const sttManager = new SttManager({
  rtmManager,
  chatManager,
})

window.rtcManager = rtcManager
window.rtmManager = rtmManager
window.chatManager = chatManager
window.sttManager = sttManager

const HomePage = () => {
  const dispatch = useDispatch()
  const nav = useNavigate()
  const { t } = useTranslation()
  const isMounted = useMount()
  const { contextHolder } = useMessage()
  const localAudioMute = useSelector((state: RootState) => state.global.localAudioMute)
  const localVideoMute = useSelector((state: RootState) => state.global.localVideoMute)
  const userInfo = useSelector((state: RootState) => state.global.userInfo)
  const options = useSelector((state: RootState) => state.global.options)
  const memberListShow = useSelector((state: RootState) => state.global.memberListShow)
  const dialogRecordShow = useSelector((state: RootState) => state.global.dialogRecordShow)
  const captionShow = useSelector((state: RootState) => state.global.captionShow)
  const aiShow = useSelector((state: RootState) => state.global.aiShow)
  const chatShow = useSelector((state: RootState) => state.global.chatShow)
  const sttData = useSelector((state: RootState) => state.global.sttData)
  const { userId, userName } = userInfo
  const { channel } = options
  const [localTracks, setLocalTracks] = useState<IUserTracks>()
  const [userRtmList, setRtmUserList] = useState<ISimpleUserInfo[]>([])
  const [rtcUserMap, setRtcUserMap] = useState<Map<number | string, IRtcUser>>(new Map())
  const [centerUserId, setCenterUserId] = useState(userInfo.userId)

  // init
  useEffect(() => {
    if (!userInfo.userId) {
      dispatch(addMessage({ content: "Please login first", type: "error" }))
      nav("/")
    }
    init()

    return () => {
      destory()
    }
  }, [])

  useEffect(() => {
    let timer: any

    if (sttData.status == "start") {
      timer = setInterval(async () => {
        const now = new Date().getTime()
        if (sttData?.startTime && sttData?.duration) {
          if (now - sttData?.startTime > sttData?.duration) {
            await window.sttManager.stopTranscription()
            return clearInterval(timer)
          }
        }
      }, 5000)
    }

    return () => {
      timer && clearInterval(timer)
    }
  }, [sttData])

  useEffect(() => {
    if (isMounted) {
      if (sttData.status == "start") {
        dispatch(
          setRecordLanguageSelect({
            translate1List: [],
            translate2List: [],
          }),
        )
        sttManager.setOption({
          taskId: sttData.taskId ?? "",
          token: sttData.token ?? "",
        })
        dispatch(setSubtitles([]))
        // Enable captions automatically when STT starts
        dispatch(setCaptionShow(true))
        dispatch(addMessage({ content: t("setting.sttStart"), type: "success" }))
      } else if (sttData.status == "end") {
        sttManager.removeOption()
        // Keep captions visible even if STT stops (to show existing transcriptions)
        // dispatch(setCaptionShow(false))
        dispatch(addMessage({ content: t("setting.sttStop"), type: "success" }))
      }
    }
    // do not put isMounted in the dependencies
  }, [sttData.status])

  const simpleUserMap: Map<number | string, IUserInfo> = useMemo(() => {
    const map = new Map<number | string, IUserInfo>()
    for (let i = 0; i < userRtmList.length; i++) {
      const item = userRtmList[i]
      const userId = Number(item.userId)
      map.set(userId, {
        userId,
        userName: item.userName,
      })
    }
    map.set(userInfo.userId, {
      userId: userInfo.userId,
      userName: userInfo.userName,
    })

    return map
  }, [userRtmList, userInfo])

  // listen events
  useEffect(() => {
    window.rtmManager.on("userListChanged", onRtmUserListChanged)
    window.rtmManager.on("languagesChanged", onLanguagesChanged)
    window.rtmManager.on("sttDataChanged", onSttDataChanged)
    window.chatManager.on("chatMessageReceived", onChatMessageReceived)
    window.chatManager.on("transcriptionReceived", onTranscriptionReceived)
    window.rtcManager.on("localUserChanged", onLocalUserChanged)
    window.rtcManager.on("remoteUserChanged", onRemoteUserChanged)
    window.rtcManager.on("textstreamReceived", onTextStreamReceived)

    return () => {
      window.rtmManager.off("userListChanged", onRtmUserListChanged)
      window.rtmManager.off("languagesChanged", onLanguagesChanged)
      window.rtmManager.off("sttDataChanged", onSttDataChanged)
      window.chatManager.off("chatMessageReceived", onChatMessageReceived)
      window.chatManager.off("transcriptionReceived", onTranscriptionReceived)
      window.rtcManager.off("localUserChanged", onLocalUserChanged)
      window.rtcManager.off("remoteUserChanged", onRemoteUserChanged)
      window.rtcManager.off("textstreamReceived", onTextStreamReceived)
    }
  }, [simpleUserMap])

  useEffect(() => {
    // localTracks.videoTrack is always ICameraVideoTrack (not IRemoteVideoTrack)
    if (localTracks?.videoTrack && "setMuted" in localTracks.videoTrack) {
      localTracks.videoTrack.setMuted(localVideoMute)
    }
  }, [localTracks?.videoTrack, localVideoMute])

  useEffect(() => {
    localTracks?.audioTrack?.setMuted(localAudioMute)
  }, [localTracks?.audioTrack, localAudioMute])

  const userDataList = useMemo(() => {
    const list: IUserData[] = []

    for (const item of simpleUserMap.values()) {
      const userId = item.userId
      const rtcUser = rtcUserMap.get(userId)
      const isCenterUser = userId === centerUserId
      const isLocalUser = userId === userInfo.userId
      list.push({
        userId,
        isLocal: isLocalUser,
        order: isCenterUser ? 1000 : 1,
        userName: item.userName,
        videoTrack: isLocalUser ? localTracks?.videoTrack : rtcUser?.videoTrack,
        audioTrack: isLocalUser ? localTracks?.audioTrack : rtcUser?.audioTrack,
        screenTrack: isLocalUser ? localTracks?.screenTrack : rtcUser?.screenTrack,
      })
    }
    return list.sort((a, b) => b.order - a.order)
  }, [simpleUserMap, userInfo, localTracks, centerUserId, rtcUserMap])

  const curUserData = useMemo(() => {
    return userDataList[0] as IUserData
  }, [userDataList])

  const init = async () => {
    try {
      await Promise.all([
        rtcManager.createTracks(),
        rtcManager.join({
          userId,
          channel,
        }),
        sttManager.init({
          userId: userId + "",
          userName,
          channel,
        }),
      ])
      await rtcManager.publish()

      // Join chat manager separately so it doesn't block other initialization
      // and errors won't prevent the app from loading
      chatManager
        .join({
          channel,
          userId: userId + "",
          userName,
        })
        .catch((error) => {
          console.error("[HomePage] Failed to connect chat manager:", error)
          // Show error message to user
          dispatch(
            addMessage({
              content: `Chat connection failed: ${error.message}. Make sure the chat server is running.`,
              type: "warning",
            }),
          )
        })

      // Auto-start transcription for all users with default language (English)
      try {
        await window.sttManager.startTranscription({
          languages: [
            {
              source: "en-US",
              target: [],
            },
          ],
        })
        // Enable captions automatically when transcription starts
        dispatch(setCaptionShow(true))
      } catch (sttError: any) {
        console.error("[HomePage] Failed to auto-start transcription:", sttError)
        // Don't show error to user - transcription might fail due to permissions
        // User can still manually start it if needed
      }
    } catch (error) {
      console.error("[HomePage] Initialization error:", error)
      dispatch(addMessage({ content: "Initialization failed", type: "error" }))
    }
  }

  const destory = async () => {
    await Promise.all([rtcManager.destroy(), sttManager.destroy(), chatManager.destroy()])
    dispatch(reset())
  }

  const onLocalUserChanged = (tracks: IUserTracks) => {
    setLocalTracks(tracks)
    if (tracks.videoTrack) {
      dispatch(setLocalVideoMute(false))
    }
    if (tracks.audioTrack) {
      dispatch(setLocalAudioMute(false))
    }
    // Update screen sharing state
    if (tracks.screenTrack) {
      dispatch(setIsScreenSharing(true))
    } else {
      dispatch(setIsScreenSharing(false))
    }
  }

  const onRtmUserListChanged = (list: ISimpleUserInfo[]) => {
    console.log("[test] onRtmUserListChanged", list)
    setRtmUserList(list)
  }

  const onRemoteUserChanged = (user: IRtcUser) => {
    setRtcUserMap((prev) => {
      const newMap = new Map(prev)
      const existingUser = newMap.get(Number(user.userId))
      // Merge with existing user data to preserve audio/video tracks when updating screenTrack
      const mergedUser = existingUser
        ? {
            userId: user.userId,
            // Always use the latest track if provided, otherwise keep existing
            videoTrack: user.videoTrack !== undefined ? user.videoTrack : existingUser.videoTrack,
            audioTrack: user.audioTrack !== undefined ? user.audioTrack : existingUser.audioTrack,
            screenTrack:
              user.screenTrack !== undefined ? user.screenTrack : existingUser.screenTrack,
          }
        : user
      newMap.set(Number(user.userId), mergedUser)
      
      // Ensure audio track is played if it exists and is not already playing
      if (mergedUser.audioTrack && !mergedUser.audioTrack.isPlaying) {
        console.log(`[HomePage] Ensuring audio playback for user ${mergedUser.userId}`)
        try {
          mergedUser.audioTrack.play().catch((error) => {
            console.error(`[HomePage] Error playing audio for user ${mergedUser.userId}:`, error)
          })
        } catch (error) {
          console.error(`[HomePage] Error in audio playback for user ${mergedUser.userId}:`, error)
        }
      }
      
      return newMap
    })
  }

  const onSttDataChanged = (data: ISttData) => {
    console.log("[test] onSttDataChanged", data)
    dispatch(setSttData(data))
  }

  const onTextStreamReceived = (textstream: ITextstream) => {
    // modify subtitle list
    const targetUser = simpleUserMap.get(Number(textstream.uid))
    dispatch(updateSubtitles({ textstream, username: targetUser?.userName || "" }))
  }

  const onTranscriptionReceived = (data: { userId: string; userName: string; textstream: ITextstream }) => {
    // Handle remote user transcription
    console.log("[HomePage] onTranscriptionReceived from remote user:", data)
    
    // Ensure the textstream has the correct uid from the remote user
    const textstreamWithUid = {
      ...data.textstream,
      uid: data.userId, // Use the userId from the message, not the local one
    }
    
    dispatch(updateSubtitles({ textstream: textstreamWithUid, username: data.userName }))
  }

  const onLanguagesChanged = (languages: ILanguageSelect) => {
    console.log("[test] onLanguagesChanged", languages)
    dispatch(setLanguageSelect(languages))
  }

  const onChatMessageReceived = (message: IChatMessage) => {
    console.log("[test] onChatMessageReceived", message)
    // The reducer now handles duplicate detection automatically
    dispatch(addChatMessage(message))
  }

  const onClickUserListItem = (data: IUserData) => {
    setCenterUserId(data.userId)
  }

  return (
    <div className={styles.homePage}>
      {contextHolder}
      <Header style={{ flex: "0 0 48px" }} />
      <section className={styles.content}>
        {memberListShow ? (
          <div className={styles.left}>
            <UserList data={userDataList.slice(1)} onClickItem={onClickUserListItem}></UserList>
          </div>
        ) : null}
        <section className={styles.center}>
          <CenterArea data={curUserData}></CenterArea>
        </section>
        {dialogRecordShow || aiShow || chatShow ? (
          <section className={styles.right}>
            <Menu></Menu>
          </section>
        ) : null}
      </section>
      <Footer style={{ flex: "0 0 80px" }} />
      <Caption visible={captionShow}></Caption>
    </div>
  )
}

export default HomePage
