import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { I18nProvider } from "./i18n/I18nProvider";
import { GuidedTourProvider } from "./components/guidedTour/GuidedTourProvider";
import { ToastProvider } from "./components/feedback/ToastProvider";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nProvider><ToastProvider><GuidedTourProvider><App /></GuidedTourProvider></ToastProvider></I18nProvider>
  </React.StrictMode>
);
