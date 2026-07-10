import { MousePointer2 } from "lucide-react";
import type { Collaborator } from "../../collaboration";

type RemoteCursorProps = {
  user: Collaborator;
};

export function RemoteCursor({ user }: RemoteCursorProps) {
  return (
    <div
      className="remote-cursor pointer-events-none absolute z-50"
      style={{ left: user.x, top: user.y, color: user.color }}
    >
      <MousePointer2 size={24} fill="currentColor" strokeWidth={1.5} />
      <span style={{ backgroundColor: user.color }}>{user.name}</span>
    </div>
  );
}
