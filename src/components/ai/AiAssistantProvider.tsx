import { startTransition, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { createAiReviewContext } from "../../features/ai/projectContext";
import { createBrowserAiProvider, createLocalOpenAiProvider } from "../../features/ai/providers";
import type { AiChatMessage, AiDesignSuggestion, AiProviderId, AiSurfaceContext, AiWorkspaceSource, LocalOpenAiConfig } from "../../features/ai/types";
import { AiAssistantContext } from "./AiAssistantContext";
import { AiChatWindow } from "./AiChatWindow";
import { DialogAiChatPortal } from "./DialogAiChatPortal";

function visibleModalDialogs() {
  return [...document.querySelectorAll<HTMLElement>('dialog[open], [role="dialog"][aria-modal="true"]')]
    .filter((element) => !element.closest("[data-ai-assistant]") && element.getClientRects().length > 0);
}

function aiEligibleDialog(dialog: HTMLElement | null) {
  return dialog && !dialog.closest("[data-ai-assistant-disabled]") ? dialog : null;
}

function dialogSurfaceElement(dialog: HTMLElement) {
  if (dialog.matches("dialog")) return dialog;
  const modalBox = dialog.querySelector<HTMLElement>(":scope > .modal-box");
  if (modalBox) return modalBox;
  if ((dialog.classList.contains("dialog-overlay") || (dialog.classList.contains("fixed") && dialog.classList.contains("inset-0"))) && dialog.firstElementChild instanceof HTMLElement) return dialog.firstElementChild;
  return dialog;
}

function dialogContext(dialog: HTMLElement): AiSurfaceContext {
  const labelId = dialog.getAttribute("aria-labelledby");
  const title = labelId ? document.getElementById(labelId)?.textContent?.trim() : undefined;
  return {
    kind: "dialog",
    id: dialog.dataset.tour ?? labelId ?? "application-dialog",
    title: title || "Current dialog"
  };
}

export function AiAssistantProvider({ workspace, children }: { workspace: AiWorkspaceSource; children: ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [surface, setSurface] = useState<AiSurfaceContext>();
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<Record<string, AiDesignSuggestion[]>>({});
  const [providerId, setProviderId] = useState<AiProviderId>("browser");
  const [localConfig, setLocalConfig] = useState<LocalOpenAiConfig>({ baseUrl: "http://127.0.0.1:1234", model: "" });
  const [localModels, setLocalModels] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [status, setStatus] = useState<string>();
  const [error, setError] = useState<string>();
  const [modalDialogOpen, setModalDialogOpen] = useState(false);
  const [dialogPortalTarget, setDialogPortalTarget] = useState<HTMLElement | null>(null);
  const [dialogSurface, setDialogSurface] = useState<AiSurfaceContext | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const invokerRef = useRef<HTMLElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const generationRef = useRef(0);

  useEffect(() => {
    let previousTarget: HTMLElement | null = null;
    let previousContextKey = "";
    let previousModalOpen = false;
    function scan() {
      const dialogs = visibleModalDialogs();
      const modalOpen = dialogs.length > 0;
      if (previousModalOpen !== modalOpen) {
        previousModalOpen = modalOpen;
        setModalDialogOpen(modalOpen);
      }
      const dialog = aiEligibleDialog(dialogs[dialogs.length - 1] ?? null);
      const target = dialog ? dialogSurfaceElement(dialog) : null;
      if (previousTarget !== target) {
        previousTarget?.classList.remove("ai-dialog-surface");
        target?.classList.add("ai-dialog-surface");
        previousTarget = target;
        setDialogPortalTarget(target);
      }
      const nextContext = dialog ? dialogContext(dialog) : null;
      const nextContextKey = nextContext ? `${nextContext.id}\0${nextContext.title}` : "";
      if (previousContextKey !== nextContextKey) {
        previousContextKey = nextContextKey;
        setDialogSurface(nextContext);
      }
    }
    scan();
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["open", "aria-modal", "class"] });
    return () => {
      observer.disconnect();
      previousTarget?.classList.remove("ai-dialog-surface");
    };
  }, []);

  useEffect(() => {
    if (!chatOpen) return;
    composerRef.current?.focus();
  }, [chatOpen]);

  const provider = providerId === "browser" ? createBrowserAiProvider() : createLocalOpenAiProvider(localConfig);

  function openChat(nextSurface: AiSurfaceContext, invoker?: HTMLElement) {
    invokerRef.current = invoker ?? null;
    setSurface(nextSurface);
    setError(undefined);
    setStatus(undefined);
    setChatOpen(true);
  }

  function cancel(discardPartial = false) {
    abortRef.current?.abort(discardPartial ? "discard" : "user");
    abortRef.current = null;
    setGenerating(false);
    if (discardPartial) {
      generationRef.current += 1;
      setStreamingText("");
    }
  }

  function clear() {
    cancel(true);
    setMessages([]);
    setSuggestions({});
    setError(undefined);
  }

  function closeChat() {
    clear();
    setChatOpen(false);
    setSurface(undefined);
    window.setTimeout(() => invokerRef.current?.focus(), 0);
  }

  function changeProvider(nextProvider: AiProviderId) {
    if (generating) cancel(true);
    setProviderId(nextProvider);
    setStatus(undefined);
    setError(undefined);
  }

  function changeLocalConfig(nextConfig: LocalOpenAiConfig) {
    if (nextConfig.baseUrl !== localConfig.baseUrl) {
      setLocalConfig({ ...nextConfig, model: "" });
      setLocalModels([]);
      setStatus(undefined);
      setError(undefined);
      return;
    }
    setLocalConfig(nextConfig);
  }

  async function testProvider() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setError(undefined);
    setStatus("Testing connection…");
    try {
      const result = await provider.test(controller.signal);
      startTransition(() => {
        setStatus(result.message);
        if (providerId !== "local-openai" || !result.models) return;
        setLocalModels(result.models);
        setLocalConfig((current) => ({
          ...current,
          model: result.models?.includes(current.model) ? current.model : result.models?.[0] ?? ""
        }));
      });
    } catch (cause) {
      if (controller.signal.aborted) return;
      startTransition(() => {
        if (providerId === "local-openai") {
          setLocalModels([]);
          setLocalConfig((current) => ({ ...current, model: "" }));
        }
        setStatus(undefined);
        setError(cause instanceof Error ? cause.message : "Connection test failed.");
      });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  async function send(instruction: string) {
    if (!surface || generating) return;
    const userMessage: AiChatMessage = { id: crypto.randomUUID(), role: "user", text: instruction };
    const assistantMessageId = crypto.randomUUID();
    const history = messages;
    abortRef.current?.abort("discard");
    setMessages((current) => [...current, userMessage]);
    setError(undefined);
    setStreamingText("");
    setGenerating(true);
    const controller = new AbortController();
    abortRef.current = controller;
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    let receivedText = "";
    try {
      const reply = await provider.generate({
        instruction,
        history,
        context: createAiReviewContext(workspace, surface),
        signal: controller.signal,
        onProgress(text) {
          if (generationRef.current !== generation || controller.signal.aborted) return;
          receivedText = text;
          startTransition(() => setStreamingText(text));
        }
      });
      if (generationRef.current !== generation) return;
      const assistantMessage: AiChatMessage = { id: assistantMessageId, role: "assistant", text: reply.text };
      startTransition(() => {
        setMessages((current) => [...current, assistantMessage]);
        if (reply.suggestions.length) setSuggestions((current) => ({ ...current, [assistantMessage.id]: reply.suggestions }));
      });
    } catch (cause) {
      if (generationRef.current !== generation) return;
      if (controller.signal.aborted) {
        if (controller.signal.reason === "user" && receivedText) {
          const partialMessage: AiChatMessage = { id: assistantMessageId, role: "assistant", text: receivedText };
          startTransition(() => setMessages((current) => [...current, partialMessage]));
        }
      } else {
        startTransition(() => setError(cause instanceof Error ? cause.message : "The AI request failed."));
      }
    } finally {
      if (generationRef.current === generation) {
        if (abortRef.current === controller) abortRef.current = null;
        setStreamingText("");
        setGenerating(false);
      }
    }
  }

  const contextValue = {
    chatOpen,
    modalDialogOpen,
    openChat,
    closeChat,
    dialogPortalTarget,
    dialogSurface,
    invokerRef
  };

  const chatWindow = chatOpen && surface ? <AiChatWindow surface={surface} messages={messages} suggestions={suggestions} providerId={providerId} localConfig={localConfig} localModels={localModels} providerLabel={provider.label} modelLabel={provider.modelLabel} generating={generating} streamingText={streamingText} status={status} error={error} composerRef={composerRef} onProviderChange={changeProvider} onLocalConfigChange={changeLocalConfig} onTest={() => void testProvider()} onSend={(instruction) => void send(instruction)} onCancel={() => cancel()} onClear={clear} onClose={closeChat} /> : null;

  return <AiAssistantContext.Provider value={contextValue}>
    {children}
    <DialogAiChatPortal />
    {chatWindow && surface?.kind === "dialog" && dialogPortalTarget ? createPortal(chatWindow, dialogPortalTarget) : chatWindow}
  </AiAssistantContext.Provider>;
}
