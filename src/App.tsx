import { useEffect, useState } from "react";
import { AnswerRelayPage } from "./components/collaboration/AnswerRelayPage";
import { clearShareFragment, parseInitialShareSignal, type InitialShareSignal } from "./collaboration/webrtc/shareToken";
import { loadParticipantRecoveryCandidate } from "./collaboration/webrtc/participantCheckpoint";
import type { ModelSeed } from "./features/modeling/types";
import { ModelingWorkspacePage } from "./pages/ModelingWorkspacePage";

export function App() {
  const [shareSignal] = useState<InitialShareSignal | undefined>(() => parseInitialShareSignal());
  const [participantRecovery] = useState(() => shareSignal ? undefined : loadParticipantRecoveryCandidate<ModelSeed>());

  useEffect(() => {
    if (shareSignal) clearShareFragment();
  }, [shareSignal]);

  if (shareSignal?.kind === "answer") return <AnswerRelayPage token={shareSignal.token} originalUrl={shareSignal.url} />;
  return <ModelingWorkspacePage initialInvitationToken={shareSignal?.kind === "invitation" ? shareSignal.token : undefined} initialParticipantRecovery={participantRecovery} />;
}
