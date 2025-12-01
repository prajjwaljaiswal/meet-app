import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useSelector } from "react-redux"
import { RootState } from "@/store"
import { useTranslation } from "react-i18next"
import { buildInviteUrl } from "@/common"

import styles from "./index.module.scss"

const PreviewPage = () => {
  const nav = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

  const userInfo = useSelector((state: RootState) => state.global.userInfo)
  const options = useSelector((state: RootState) => state.global.options)
  const { userName } = userInfo
  const { channel } = options

  const inviteUrl = useMemo(() => {
    if (!channel) return ""
    return buildInviteUrl(channel, userName)
  }, [channel, userName])

  useEffect(() => {
    if (!channel || !userName) {
      // Missing basic info, go back to login
      nav("/login" + location.search)
      return
    }

    let isCancelled = false

    const startPreview = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })
        if (isCancelled) {
          mediaStream.getTracks().forEach((t) => t.stop())
          return
        }
        setStream(mediaStream)
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
          videoRef.current.play().catch(() => {
            // Autoplay might be blocked; user can start by interacting
          })
        }
      } catch (error) {
        console.error("Failed to start local preview:", error)
      }
    }

    startPreview()

    return () => {
      isCancelled = true
      if (stream) {
        stream.getTracks().forEach((t) => t.stop())
      }
    }
    // we intentionally omit `stream` from deps so cleanup runs only on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, userName, nav, location.search])

  const copyInvite = () => {
    if (!inviteUrl) return
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(inviteUrl).catch(() => {
        window.prompt("Copy this invitation link and send it to others:", inviteUrl)
      })
    } else {
      window.prompt("Copy this invitation link and send it to others:", inviteUrl)
    }
  }

  const handleJoin = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop())
    }
    nav("/home")
  }

  const handleBack = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop())
    }
    nav("/login" + location.search)
  }

  return (
    <div className={styles.previewPage}>
      <div className={styles.previewCard}>
        <div className={styles.header}>
          <div className={styles.title}>{t("login.title") || "Join meeting"}</div>
          <div className={styles.subtitle}>
            {t("channel") || "Channel"}: <span className={styles.highlight}>{channel}</span>
          </div>
          <div className={styles.subtitle}>
            {t("userName") || "Name"}: <span className={styles.highlight}>{userName}</span>
          </div>
        </div>
        {inviteUrl ? (
          <div className={styles.inviteCard}>
            <div className={styles.inviteLabel}>
              {t("instantLink") || "Instant meeting link"}
            </div>
            <div className={styles.inviteContent}>
              <span className={styles.inviteUrl} title={inviteUrl}>
                {inviteUrl}
              </span>
              <button type="button" className={styles.inviteButton} onClick={copyInvite}>
                {t("invite") || "Copy link"}
              </button>
            </div>
          </div>
        ) : null}
        <div className={styles.videoWrapper}>
          <video ref={videoRef} className={styles.video} autoPlay playsInline muted />
          {!stream && (
            <div className={styles.videoHint}>
              {t("preview.loadingCamera") || "Allow camera and microphone access to see a preview."}
            </div>
          )}
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={handleBack}>
            {t("back") || "Back"}
          </button>
          <button type="button" className={styles.primaryButton} onClick={handleJoin}>
            {t("login.join") || "Join"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PreviewPage


