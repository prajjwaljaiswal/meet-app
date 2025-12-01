import { TranscriptionIcon } from "../icons"
import { RootState } from "@/store"
import Time from "./time"
import NetWork from "./network"
import { useSelector } from "react-redux"
import { useTranslation } from "react-i18next"
import { buildInviteUrl } from "@/common"

import styles from "./index.module.scss"

interface IHeaderProps {
  style?: React.CSSProperties
}

const Header = (props: IHeaderProps) => {
  const { style } = props
  const sttData = useSelector((state: RootState) => state.global.sttData)
  const options = useSelector((state: RootState) => state.global.options)
  const userInfo = useSelector((state: RootState) => state.global.userInfo)
  const { channel } = options
  const { userName } = userInfo
  const { t } = useTranslation()

  const inviteUrl = channel ? buildInviteUrl(channel, userName) : ""

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

  return (
    <header className={styles.header} style={style}>
      <NetWork></NetWork>
      <div className={styles.meetingInfo}>
        <span className={styles.channelName}>{channel}</span>
        {inviteUrl ? (
          <div className={styles.inviteCard}>
            <div className={styles.inviteLabel}>{t("meetingLink") || "Meeting link"}</div>
            <div className={styles.inviteContent}>
              <span className={styles.inviteUrl} title={inviteUrl}>
                {inviteUrl}
              </span>
              <button className={styles.inviteButton} type="button" onClick={copyInvite}>
                {t("invite") || "Copy link"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
      <span className={styles.transcription}>
        {sttData.status == "start" ? (
          <>
            <TranscriptionIcon></TranscriptionIcon>
            <span className={styles.text}>{t("transcribing")}</span>
          </>
        ) : null}
      </span>
      <Time></Time>
    </header>
  )
}

export default Header
