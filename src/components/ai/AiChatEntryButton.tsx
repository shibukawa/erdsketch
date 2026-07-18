import { MessageCircleMore } from "lucide-react";
import type { MouseEvent } from "react";
import type { AiSurfaceContext } from "../../features/ai/types";
import { useAiAssistant } from "./AiAssistantContext";

export function AiChatEntryButton({ surface, placement }: { surface: AiSurfaceContext; placement: "canvas" | "dialog" }) {
  const { chatOpen, modalDialogOpen, openChat } = useAiAssistant();
  if (chatOpen || (placement === "canvas" && modalDialogOpen)) return null;

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    openChat(surface, event.currentTarget);
  }

  return <button
    type="button"
    className={placement === "canvas"
      ? "btn btn-primary btn-sm absolute right-4 top-4 z-40 gap-2 shadow-lg"
      : "ai-dialog-chat-entry btn btn-primary btn-sm btn-square shadow-lg"}
    onClick={handleClick}
    aria-label={placement === "canvas" ? "Ask AI about this canvas" : "Ask AI about this dialog"}
    title={placement === "canvas" ? "Ask AI about this canvas" : "Ask AI about this dialog"}
  >
    <MessageCircleMore size={18} />
    {placement === "canvas" && <span className="hidden xl:inline">Ask AI</span>}
  </button>;
}
