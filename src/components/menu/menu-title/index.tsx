import { TranscriptionIcon, AiIcon } from "@/components/icons"
import { CloseOutlined, MessageOutlined } from "@ant-design/icons"
import { RootState } from "@/store"
import { useSelector, useDispatch } from "react-redux"
import React, { useEffect, useMemo, useRef, useState } from "react"
import { MenuType } from "@/types"
import {
  setAIShow,
  setDialogRecordShow,
  setChatShow,
  removeMenuItem,
  addMenuItem,
} from "@/store/reducers/global"

import styles from "./index.module.scss"
import { useTranslation } from "react-i18next"

const MenuTitle = () => {
  const dispatch = useDispatch()
  const { t } = useTranslation()
  const menuList = useSelector((state: RootState) => state.global.menuList)
  const activeType = menuList[0]

  const TitleOneText = useMemo(() => {
    if (activeType == "AI") {
      return t("footer.aIAssistant")
    } else if (activeType == "Chat") {
      return t("footer.chat") || "Chat"
    } else {
      return t("footer.conversationHistory")
    }
  }, [activeType])

  const onClickClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (activeType === "AI") {
      dispatch(setAIShow(false))
      dispatch(removeMenuItem("AI"))
    } else if (activeType === "Chat") {
      dispatch(setChatShow(false))
      dispatch(removeMenuItem("Chat"))
    } else {
      dispatch(setDialogRecordShow(false))
      dispatch(removeMenuItem("DialogRecord"))
    }
  }

  const onClickItem = (type: MenuType) => {
    dispatch(addMenuItem(type))
  }

  return (
    <div className={styles.title}>
      {menuList.length == 1 ? (
        <div className={styles.titleOne}>
          {activeType == "Chat" ? (
            <MessageOutlined style={{ fontSize: "16px" }} />
          ) : activeType == "AI" ? (
            <AiIcon width={16} height={16}></AiIcon>
          ) : (
            <TranscriptionIcon width={16} height={16}></TranscriptionIcon>
          )}
          <span className={styles.text}>{TitleOneText}</span>
          <CloseOutlined style={{ fontSize: "12px" }} onClick={onClickClose} />
        </div>
      ) : (
        <div className={styles.titleTwo}>
          <span
            className={`${styles.item} ${activeType == "DialogRecord" ? "active" : ""}`}
            onClick={() => onClickItem("DialogRecord")}
          >
            <TranscriptionIcon width={16} height={16}></TranscriptionIcon>
            <span className={styles.text}>{t("footer.conversationHistory")}</span>
            {activeType == "DialogRecord" ? (
              <CloseOutlined style={{ fontSize: "12px" }} onClick={onClickClose} />
            ) : null}
          </span>
          <span
            className={`${styles.item} ${activeType == "Chat" ? "active" : ""}`}
            onClick={() => onClickItem("Chat")}
          >
            <MessageOutlined style={{ fontSize: "16px" }} />
            <span className={styles.text}>{t("footer.chat") || "Chat"}</span>
            {activeType == "Chat" ? (
              <CloseOutlined style={{ fontSize: "12px" }} onClick={onClickClose} />
            ) : null}
          </span>
          <span
            className={`${styles.item} ${activeType == "AI" ? "active" : ""}`}
            onClick={() => onClickItem("AI")}
          >
            <AiIcon width={16} height={16}></AiIcon>
            <span className={styles.text}>{t("footer.aIAssistant")}</span>
            {activeType == "AI" ? (
              <CloseOutlined style={{ fontSize: "12px" }} onClick={onClickClose} />
            ) : null}
          </span>
        </div>
      )}
    </div>
  )
}

export default MenuTitle
