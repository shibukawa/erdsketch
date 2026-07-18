import type { AiSurfaceContext } from "../../features/ai/types";
import { AiChatEntryButton } from "./AiChatEntryButton";

export function CanvasAiChatButton({ surface }: { surface: AiSurfaceContext }) {
  return <AiChatEntryButton surface={surface} placement="canvas" />;
}
