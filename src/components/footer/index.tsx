import {
  MicIcon,
  CamIcon,
  MemberIcon,
  CaptionIcon,
  TranscriptionIcon,
  SettingIcon,
  AiIcon,
  ArrowUpIcon,
  ScreenShareIcon,
} from "../icons"
import { MessageOutlined } from "@ant-design/icons"
import { showAIModule } from "@/common"
import { useSelector, useDispatch } from "react-redux"
import {
  setUserInfo,
  setMemberListShow,
  setDialogRecordShow,
  setCaptionShow,
  setAIShow,
  setChatShow,
  removeMenuItem,
  addMenuItem,
  setLocalAudioMute,
  setLocalVideoMute,
  setIsScreenSharing,
  addMessage,
  setTipSTTEnable,
} from "@/store/reducers/global"
// LanguageSettingDialog removed - using English as default
import CaptionPopover from "./caption-popover"
import { Popover } from "antd"
import { RootState } from "@/store"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useLocation } from "react-router-dom"

import styles from "./index.module.scss"

interface IFooterProps {
  style?: React.CSSProperties
}

const Footer = (props: IFooterProps) => {
  const { style } = props
  const nav = useNavigate()
  const dispatch = useDispatch()
  const { t } = useTranslation()
  const location = useLocation()
  const localAudioMute = useSelector((state: RootState) => state.global.localAudioMute)
  const localVideoMute = useSelector((state: RootState) => state.global.localVideoMute)
  const isScreenSharing = useSelector((state: RootState) => state.global.isScreenSharing)
  const memberListShow = useSelector((state: RootState) => state.global.memberListShow)
  const dialogRecordShow = useSelector((state: RootState) => state.global.dialogRecordShow)
  const captionShow = useSelector((state: RootState) => state.global.captionShow)
  const tipSTTEnable = useSelector((state: RootState) => state.global.tipSTTEnable)
  const aiShow = useSelector((state: RootState) => state.global.aiShow)
  const chatShow = useSelector((state: RootState) => state.global.chatShow)
  const sttData = useSelector((state: RootState) => state.global.sttData)
  // Language setting state removed - using English as default

  useEffect(() => {
    if (tipSTTEnable) {
      setTimeout(() => {
        dispatch(setTipSTTEnable(false))
      }, 4000)
    }
  }, [tipSTTEnable])

  const hasSttStarted = useMemo(() => {
    return sttData.status === "start"
  }, [sttData])

  const MicText = useMemo(() => {
    return localAudioMute ? t("footer.unMuteAudio") : t("footer.muteAudio")
  }, [localAudioMute])

  const CameraText = useMemo(() => {
    return localVideoMute ? t("footer.unMuteVideo") : t("footer.muteVideo")
  }, [localVideoMute])

  const ScreenShareText = useMemo(() => {
    return isScreenSharing ? t("footer.stopScreenShare") : t("footer.startScreenShare")
  }, [isScreenSharing])

  const captionText = useMemo(() => {
    return captionShow ? t("footer.stopCC") : t("footer.startCC")
  }, [captionShow])

  const onClickMic = () => {
    dispatch(setLocalAudioMute(!localAudioMute))
  }

  const onClickCam = () => {
    dispatch(setLocalVideoMute(!localVideoMute))
  }

  const onClickScreenShare = async () => {
    try {
      if (isScreenSharing) {
        await window.rtcManager.stopScreenShare()
        dispatch(setIsScreenSharing(false))
        dispatch(addMessage({ content: t("footer.screenShareStopped"), type: "success" }))
      } else {
        await window.rtcManager.startScreenShare()
        dispatch(setIsScreenSharing(true))
        dispatch(addMessage({ content: t("footer.screenShareStarted"), type: "success" }))
      }
    } catch (error: any) {
      console.error("Screen share error:", error)
      dispatch(addMessage({ content: error?.message || t("footer.screenShareError"), type: "error" }))
      dispatch(setIsScreenSharing(false))
    }
  }

  const onClickMember = () => {
    dispatch(setMemberListShow(!memberListShow))
  }

  const onClickDialogRecord = () => {
    dispatch(setDialogRecordShow(!dialogRecordShow))
    if (dialogRecordShow) {
      dispatch(removeMenuItem("DialogRecord"))
    } else {
      dispatch(addMenuItem("DialogRecord"))
    }
  }

  const onClickCaption = () => {
    if (sttData.status !== "start") {
      return dispatch(setTipSTTEnable(true))
    }
    dispatch(setCaptionShow(!captionShow))
  }

  const onClickAiShow = () => {
    dispatch(setAIShow(!aiShow))
    if (aiShow) {
      dispatch(removeMenuItem("AI"))
    } else {
      dispatch(addMenuItem("AI"))
    }
  }

  const onClickChat = () => {
    dispatch(setChatShow(!chatShow))
    if (chatShow) {
      dispatch(removeMenuItem("Chat"))
    } else {
      dispatch(addMenuItem("Chat"))
    }
  }

  const toggleLanguageSettingDialog = async () => {
    // Directly start/stop transcription with English (no language selection modal)
    try {
      if (!hasSttStarted) {
        // Start transcription with English as default
        await window.sttManager.startTranscription({
          languages: [
            {
              source: "en-US",
              target: [],
            },
          ],
        })
      } else {
        // Stop transcription
        await window.sttManager.stopTranscription()
      }
    } catch (e: any) {
      console.error(e)
      dispatch(addMessage({ content: e.message || "Failed to toggle transcription", type: "error" }))
    }
  }

  const onClickEnd = () => {
    if (location.search) {
      nav(`/?${location.search.slice(1)}`)
    } else {
      nav("/")
    }
    dispatch(addMessage({ content: "end meeting success!", type: "success" }))
  }

  return (
    <footer className={styles.footer} style={style}>
      <section className={styles.content}>
        {/* audio */}
        <span className={styles.item} onClick={onClickMic}>
          <MicIcon active={!localAudioMute}></MicIcon>
          <span className={styles.text}>{MicText}</span>
        </span>
        {/* video */}
        <span className={styles.item} onClick={onClickCam}>
          <CamIcon active={!localVideoMute}></CamIcon>
          <span className={styles.text}>{CameraText}</span>
        </span>
        {/* screen share */}
        <span className={styles.item} onClick={onClickScreenShare}>
          <ScreenShareIcon active={isScreenSharing}></ScreenShareIcon>
          <span className={styles.text}>{ScreenShareText}</span>
        </span>
        {/* member */}
        <span className={styles.item} onClick={onClickMember}>
          <MemberIcon active={memberListShow}></MemberIcon>
          <span className={styles.text}>{t("footer.participantsList")}</span>
        </span>
        {/* caption */}
        <span
          className={`${styles.item} ${!hasSttStarted ? "disabled" : ""}`}
          onClick={onClickCaption}
        >
          <CaptionIcon disabled={!hasSttStarted} active={captionShow}></CaptionIcon>
          <span className={styles.text}>{captionText}</span>
        </span>
        <CaptionPopover>
          <span className={styles.arrowWrapper}>
            <ArrowUpIcon width={16} height={16}></ArrowUpIcon>
          </span>
        </CaptionPopover>
        {/* chat */}
        <span className={`${styles.item}`} onClick={onClickChat}>
          <MessageOutlined style={{ fontSize: "20px", color: chatShow ? "#3d53f5" : undefined }} />
          <span className={styles.text}>{t("footer.chat") || "Chat"}</span>
        </span>
        {/* dialog */}
        <span className={`${styles.item}`} onClick={onClickDialogRecord}>
          <TranscriptionIcon active={dialogRecordShow}></TranscriptionIcon>
          <span className={styles.text}>{t("footer.conversationHistory")}</span>
        </span>
        {/* language */}
        <Popover placement="top" content={t("footer.tipEnableSTTFirst")} open={tipSTTEnable}>
          <span className={`${styles.item}`} onClick={toggleLanguageSettingDialog}>
            <SettingIcon></SettingIcon>
            <span className={`${styles.text}`}>{t("footer.langaugesSetting")}</span>
          </span>
        </Popover>
        {/* ai */}
        {showAIModule() ? (
          <span className={styles.item} onClick={onClickAiShow}>
            <AiIcon active={aiShow}></AiIcon>
            <span className={styles.text}>{t("footer.aIAssistant")}</span>
          </span>
        ) : null}
      </section>
      <span className={styles.end} onClick={onClickEnd}>
        {t("closeConversation")}
      </span>
      {/* Language selection modal removed - using English as default */}
    </footer>
  )
}

export default Footer
