import { Switch, Input, message } from "antd"
import { useSelector, useDispatch } from "react-redux"
import { RootState } from "@/store"
import { InputStatuses } from "@/types"
import { useTranslation } from "react-i18next"
import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import {
  genRandomUserId,
  REGEX_SPECIAL_CHAR,
  GITHUB_URL,
  parseQuery,
  genUUID,
  buildInviteUrl,
} from "@/common"
import { setOptions, setUserInfo } from "@/store/reducers/global"
import { version } from "../../../package.json"
import { useNavigate, useLocation } from "react-router-dom"

import styles from "./index.module.scss"
import logoSrc from "https://www.dotsquares.com/assets/dots-logo.svg"
import githubSrc from "@/assets/github.jpg"

const LoginPage = () => {
  const nav = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const dispatch = useDispatch()
  const [messageApi, contextHolder] = message.useMessage()
  const options = useSelector((state: RootState) => state.global.options)
  const [channel, setChannel] = useState("")
  const [userName, setUserName] = useState("")
  const [channelInputStatuses, setChannelInputStatuses] = useState<InputStatuses>("")
  const [newMeetingMenuOpen, setNewMeetingMenuOpen] = useState(false)

  const onChangeChannel = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value
    if (REGEX_SPECIAL_CHAR.test(value)) {
      setChannelInputStatuses("error")
      value = value.replace(REGEX_SPECIAL_CHAR, "")
    } else {
      setChannelInputStatuses("")
    }
    setChannel(value)
  }

  const onChangeUserName = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value
    if (REGEX_SPECIAL_CHAR.test(value)) {
      value = value.replace(REGEX_SPECIAL_CHAR, "")
    }
    setUserName(value)
  }

  const onLanguageChange = useCallback(
    (checked: boolean) => {
      const language = checked ? "zh" : "en"
      dispatch(setOptions({ language }))
      i18n.changeLanguage(language)
    },
    [i18n],
  )

  useEffect(() => {
    if (location.search) {
      const params = parseQuery(location.search)
      if (params.channel) {
        setChannel(params.channel)
      }
      if (params.userName) {
        try {
          setUserName(decodeURIComponent(params.userName))
        } catch {
          setUserName(params.userName)
        }
      }
    }
  }, [location.search])

  const createRandomChannel = () => {
    return `room-${genUUID().slice(0, 8)}`
  }

  const onCreateMeetingForLater = () => {
    const newChannel = createRandomChannel()
    const inviteUrl = buildInviteUrl(newChannel)
    window.prompt("Copy this meeting link and share it with others:", inviteUrl)
    setNewMeetingMenuOpen(false)
  }

  const onStartInstantMeeting = () => {
    const newChannel = createRandomChannel()
    const finalUserName = userName || "Host"
    dispatch(setOptions({ channel: newChannel }))
    dispatch(
      setUserInfo({
        userName: finalUserName,
        userId: genRandomUserId(),
      }),
    )
    setChannel(newChannel)
    setNewMeetingMenuOpen(false)
    nav("/preview")
  }

  const onClickJoin = () => {
    if (!channel) {
      return messageApi.error("please enter channel name!")
    }
    if (!userName) {
      return messageApi.error("please enter user name!")
    }
    dispatch(setOptions({ channel }))
    dispatch(
      setUserInfo({
        userName,
        userId: genRandomUserId(),
      }),
    )
    nav("/preview")
  }

  const onClickGithub = () => {
    window.open(GITHUB_URL, "_blank")
  }

  return (
    <div className={styles.loginPage}>
      {contextHolder}
      <section className={styles.content}>
        {/* <section className={styles.top}>
          <span className={styles.language}>
            <Switch
              size="default"
              checkedChildren="中文"
              unCheckedChildren="English"
              value={options.language === "zh"}
              onChange={onLanguageChange}
            />
          </span>
        </section> */}
        <div className={styles.title}>
          {/* <div className={styles.logo}> */}
          <img src={"https://www.dotsquares.com/assets/dots-logo.svg"} width={100} alt="logo" />
          {/* </div> */}
          <div className={styles.text}>{t("login.title")}</div>
        </div>
        <div className={styles.newMeetingRow}>
          <div className={styles.newMeetingWrapper}>
            <button
              type="button"
              className={styles.newMeetingButton}
              onClick={() => setNewMeetingMenuOpen((v) => !v)}
            >
              <span className={styles.newMeetingIcon}>＋</span>
              <span className={styles.newMeetingText}>New meeting</span>
            </button>
            {newMeetingMenuOpen ? (
              <div className={styles.newMeetingMenu}>
                <div className={styles.menuItem} onClick={onCreateMeetingForLater}>
                  Create a meeting for later
                </div>
                <div className={styles.menuItem} onClick={onStartInstantMeeting}>
                  Start an instant meeting
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <div className={styles.item}>
          <Input
            status={channelInputStatuses}
            allowClear
            placeholder="Please enter channel name"
            onChange={onChangeChannel}
            value={channel}
            style={{
              color: "#ffffff",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
            }}
          />
        </div>
        <div className={styles.item}>
          <Input
            allowClear
            placeholder="Please enter user name"
            onChange={onChangeUserName}
            value={userName}
            style={{
              color: "#ffffff",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
            }}
          />
        </div>
        <div className={styles.btn} onClick={onClickJoin}>
          {t("login.join")}
        </div>
        {/* <div className={styles.version}>Version {version}</div> */}
      </section>
    </div>
  )
}

export default LoginPage
