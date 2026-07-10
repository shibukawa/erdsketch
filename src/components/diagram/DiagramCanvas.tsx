import type {
  PointerEvent,
  PointerEventHandler,
  RefObject,
  WheelEventHandler
} from "react";
import type { Collaborator } from "../../collaboration";
import type { CardDisplayMode, DragState, ModelSeed, Viewport } from "../../features/modeling/types";
import { ModelSeedCard } from "./ModelSeedCard";
import { RemoteCursor } from "./RemoteCursor";
import { RoughLink } from "./RoughLink";

type DiagramCanvasProps = {
  canvasRef: RefObject<HTMLDivElement | null>;
  dragState: DragState;
  viewport: Viewport;
  seeds: ModelSeed[];
  selectedId: string;
  displayMode: CardDisplayMode;
  locks: Record<string, Collaborator>;
  me: Collaborator;
  remoteUsers: Collaborator[];
  onDoubleClick: React.MouseEventHandler<HTMLDivElement>;
  onPointerDown: PointerEventHandler<HTMLDivElement>;
  onPointerMove: PointerEventHandler<HTMLDivElement>;
  onPointerLeave: PointerEventHandler<HTMLDivElement>;
  onPointerUp: PointerEventHandler<HTMLDivElement>;
  onWheel: WheelEventHandler<HTMLDivElement>;
  onSeedPointerDown: (event: PointerEvent<HTMLElement>, seed: ModelSeed) => void;
  onUpdateSeed: (seedId: string, patch: Partial<ModelSeed>) => void;
  onUnlockSeed: (seedId: string) => void;
};

export function DiagramCanvas({
  canvasRef,
  dragState,
  viewport,
  seeds,
  selectedId,
  displayMode,
  locks,
  me,
  remoteUsers,
  onDoubleClick,
  onPointerDown,
  onPointerMove,
  onPointerLeave,
  onPointerUp,
  onWheel,
  onSeedPointerDown,
  onUpdateSeed,
  onUnlockSeed
}: DiagramCanvasProps) {
  return (
    <div
      ref={canvasRef}
      className={`erd-canvas relative min-h-0 flex-1 overflow-hidden ${dragState?.type === "pan" ? "cursor-grabbing" : "cursor-grab"}`}
      onDoubleClick={onDoubleClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    >
      <div
        className="absolute left-0 top-0 h-[2400px] w-[3200px] origin-top-left"
        style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})` }}
      >
        <div className="pointer-events-none absolute inset-0">
          <RoughLink path="M300 180 C365 165, 410 168, 485 195" roughness={2.1} />
          <RoughLink path="M300 235 C315 300, 330 335, 400 388" roughness={2.5} />
          <RoughLink path="M650 226 C718 220, 760 240, 820 310" roughness={2.8} />
        </div>

        {seeds.map((seed) => (
          <ModelSeedCard
            key={seed.id}
            seed={seed}
            selected={selectedId === seed.id}
            displayMode={displayMode}
            owner={locks[seed.id]}
            me={me}
            onPointerDown={onSeedPointerDown}
            onUpdate={onUpdateSeed}
            onUnlock={onUnlockSeed}
          />
        ))}

        {remoteUsers.map((user) => (
          <RemoteCursor key={user.id} user={user} />
        ))}
      </div>
    </div>
  );
}
