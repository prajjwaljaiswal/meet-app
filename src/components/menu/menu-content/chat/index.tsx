import { useSelector, useDispatch } from "react-redux"
import { RootState } from "@/store"
import { addChatMessage } from "@/store/reducers/global"
import { IChatMessage } from "@/types"
import { formatTime2 } from "@/common"
import { useEffect, useRef, useState } from "react"
import Avatar from "@/components/avatar"
import styles from "./index.module.scss"
import { useTranslation } from "react-i18next"
import { SendOutlined } from "@ant-design/icons"

const Chat = () => {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const chatMessages = useSelector((state: RootState) => state.global.chatMessages)
  const userInfo = useSelector((state: RootState) => state.global.userInfo)
  const [inputValue, setInputValue] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Monitor connection status
  useEffect(() => {
    if (window.chatManager) {
      // Check initial connection status
      setIsConnected(window.chatManager.isConnected)

      // Update status periodically in case it changes
      const checkInterval = setInterval(() => {
        if (window.chatManager) {
          setIsConnected(window.chatManager.isConnected)
        }
      }, 1000)

      const onConnected = () => {
        console.log("[Chat] Connected to chat server")
        setIsConnected(true)
      }

      const onDisconnected = () => {
        console.log("[Chat] Disconnected from chat server")
        setIsConnected(false)
      }

      const onError = (error: Error) => {
        console.error("[Chat] Connection error:", error)
        setIsConnected(false)
      }

      window.chatManager.on("connected", onConnected)
      window.chatManager.on("disconnected", onDisconnected)
      window.chatManager.on("error", onError)

      return () => {
        clearInterval(checkInterval)
        window.chatManager?.off("connected", onConnected)
        window.chatManager?.off("disconnected", onDisconnected)
        window.chatManager?.off("error", onError)
      }
    }
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages])

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) {
      return
    }

    // Check if chat manager is connected
    if (!window.chatManager?.isConnected) {
      console.error("Chat manager is not connected")
      // Could show a toast/notification here
      return
    }

    const messageContent = inputValue.trim()
    const timestamp = Date.now()
    const tempMessage: IChatMessage = {
      id: `temp-${timestamp}-${Math.random().toString(36).substring(7)}`,
      userId: String(userInfo.userId),
      userName: userInfo.userName,
      content: messageContent,
      timestamp,
    }

    // Clear input immediately for better UX
    setInputValue("")
    setIsSending(true)

    // Optimistic update - add message immediately
    dispatch(addChatMessage(tempMessage))

    try {
      await window.chatManager.sendChatMessage(messageContent)
      // Message will be received from server and added via onChatMessageReceived
      // The duplicate detection will handle replacing the temp message
    } catch (error) {
      console.error("Failed to send chat message:", error)
      // Restore message on error
      setInputValue(messageContent)
      // Could show error notification to user here
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isOwnMessage = (message: IChatMessage) => {
    return message.userId === String(userInfo.userId)
  }

  return (
    <div className={styles.chat}>
      {!isConnected && (
        <div
          style={{
            padding: "8px",
            background: "#fff3cd",
            color: "#856404",
            fontSize: "12px",
            textAlign: "center",
          }}
        >
          Connecting to chat server...
          <div style={{ fontSize: "10px", marginTop: "4px", opacity: 0.8 }}>
            Make sure the server is running: <code>cd server && npm start</code>
          </div>
        </div>
      )}
      <div className={styles.messages} ref={contentRef}>
        {chatMessages.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyText}>{t("chat.noMessages") || "No messages yet"}</div>
          </div>
        ) : (
          chatMessages.map((message) => (
            <div
              key={message.id}
              className={`${styles.messageItem} ${isOwnMessage(message) ? styles.ownMessage : ""}`}
            >
              <div className={styles.left}>
                <Avatar userName={message.userName}></Avatar>
              </div>
              <div className={styles.right}>
                <div className={styles.header}>
                  <div className={styles.userName}>{message.userName}</div>
                  <div className={styles.time}>{formatTime2(message.timestamp)}</div>
                </div>
                <div className={styles.content}>{message.content}</div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className={styles.inputWrapper}>
        <textarea
          className={styles.input}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={t("chat.placeholder") || "Type a message..."}
          rows={1}
          disabled={isSending}
        />
        <button
          className={styles.sendButton}
          onClick={handleSend}
          disabled={!inputValue.trim() || isSending}
        >
          <SendOutlined />
        </button>
      </div>
    </div>
  )
}

export default Chat
