import React, { Suspense } from "react"
import ReactDOM from "react-dom/client"
import App from "./App.tsx"
import store from "./store"
import { Provider } from "react-redux"
import { ConfigProvider } from "antd"
import { I18nextProvider } from "react-i18next"

import i18n from "./i18n"

import "./styles/reset.css"
import "./styles/global.css"

const theme = {
  token: {
    colorPrimary: "#0B5FFF",
    colorInfo: "#0B5FFF",
    colorSuccess: "#00C853",
    colorWarning: "#FF9800",
    colorError: "#F44336",
    borderRadius: 8,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  },
  components: {
    Switch: {
      trackHeight: 24,
      handleSize: 20,
    },
    Input: {
      borderRadius: 8,
      paddingBlock: 10,
      paddingInline: 14,
    },
    Button: {
      borderRadius: 8,
      fontWeight: 500,
    },
  },
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <ConfigProvider theme={theme}>
      <I18nextProvider i18n={i18n}>
        <Suspense fallback={"loading..."}>
          <App />
        </Suspense>
      </I18nextProvider>
    </ConfigProvider>
  </Provider>,
)
