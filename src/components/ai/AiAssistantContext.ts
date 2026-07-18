import { createContext, useContext, type RefObject } from "react";
import type { AiSurfaceContext } from "../../features/ai/types";

export type AiAssistantContextValue = {
  chatOpen: boolean;
  modalDialogOpen: boolean;
  openChat: (surface: AiSurfaceContext, invoker?: HTMLElement) => void;
  closeChat: () => void;
  dialogPortalTarget: HTMLElement | null;
  dialogSurface: AiSurfaceContext | null;
  invokerRef: RefObject<HTMLElement | null>;
};

export const AiAssistantContext = createContext<AiAssistantContextValue | undefined>(undefined);

export function useAiAssistant() {
  const context = useContext(AiAssistantContext);
  if (!context) throw new Error("useAiAssistant must be used inside AiAssistantProvider");
  return context;
}
