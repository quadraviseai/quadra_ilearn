import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider } from "antd";
import { BrowserRouter } from "react-router-dom";

import App from "./App.jsx";
import { AuthProvider } from "./state/AuthContext.jsx";
import "antd/dist/reset.css";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#fb6404",
          colorTextBase: "#103e6f",
          colorBgBase: "#fcfaf2",
          borderRadius: 16,
          fontFamily: '"Trebuchet MS", "Gill Sans", sans-serif',
        },
      }}
    >
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  </StrictMode>,
);
