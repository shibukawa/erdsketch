import { createPortal } from "react-dom";
import { AiChatEntryButton } from "./AiChatEntryButton";
import { useAiAssistant } from "./AiAssistantContext";

export function DialogAiChatPortal() {
  const { dialogPortalTarget, dialogSurface } = useAiAssistant();
  if (!dialogPortalTarget || !dialogSurface) return null;
  return createPortal(<AiChatEntryButton surface={dialogSurface} placement="dialog" />, dialogPortalTarget);
}
