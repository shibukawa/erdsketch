import { Share2, UsersRound } from "lucide-react";
import type { Collaborator } from "../../collaboration";

type CoworkParticipantSummaryProps = {
  me: Collaborator;
  users: Collaborator[];
  connected: boolean;
  isHost: boolean;
  onOpenCowork: () => void;
  iconSize?: number;
};

export function CoworkParticipantSummary({ me, users, connected, isHost, onOpenCowork, iconSize = 16 }: CoworkParticipantSummaryProps) {
  const participants = [me, ...users.filter((user) => user.id !== me.id)];
  const otherUsers = participants.filter((user) => user.id !== me.id);
  const visibleUsers = otherUsers.slice(0, 4);
  const hiddenCount = Math.max(0, otherUsers.length - visibleUsers.length);

  return <div className="group relative flex items-center">
    {isHost && <button type="button" className="btn btn-primary btn-sm gap-2" onClick={onOpenCowork} aria-describedby="cowork-participant-list"><Share2 size={iconSize} />Co-work</button>}
    <button type="button" className={`flex h-9 items-center rounded-full px-1.5 outline-none transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-violet-500 ${isHost ? "ml-1" : ""}`} aria-label={`Show all ${participants.length} Co-work participants`} aria-describedby="cowork-participant-list">
      <span className="flex -space-x-2" aria-hidden="true">
        {visibleUsers.map((user) => <span key={user.id} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white" style={{ backgroundColor: user.color }}>{user.name.slice(0, 1).toUpperCase()}</span>)}
        {hiddenCount > 0 && <span className="flex h-8 min-w-8 items-center justify-center rounded-full border-2 border-white bg-slate-600 px-1 text-[10px] font-bold text-white">+{hiddenCount}</span>}
        {visibleUsers.length === 0 && <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-slate-500"><UsersRound size={15} /></span>}
      </span>
    </button>

    <div className="invisible absolute right-0 top-full z-50 w-72 pt-2 opacity-0 transition duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
      <div id="cowork-participant-list" className="max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl" role="tooltip">
        <div className="flex items-center justify-between px-2 py-1.5"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Co-work participants</p><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{participants.length}</span></div>
        <ul className="mt-1 space-y-1">
          {participants.map((user) => {
            const isMe = user.id === me.id;
            const online = isMe ? connected : user.online;
            return <li key={user.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: user.color }}>{user.name.slice(0, 1).toUpperCase()}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800">{user.name}{isMe ? " (You)" : ""}</span><span className="flex items-center gap-1.5 text-xs text-slate-500"><span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-500" : "bg-slate-300"}`} />{online ? "Connected" : "Disconnected"}</span></span>
              {isMe && isHost && <span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700">Host</span>}
            </li>;
          })}
        </ul>
      </div>
    </div>
  </div>;
}
