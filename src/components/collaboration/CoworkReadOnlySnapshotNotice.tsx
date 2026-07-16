import { Eye } from "lucide-react";

export function CoworkReadOnlySnapshotNotice() {
  return <div className="pointer-events-none fixed left-1/2 top-3 z-[110] -translate-x-1/2" role="status">
    <div className="flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-950 shadow-lg">
      <Eye size={15} />Read-only Co-work snapshot · Editing is disabled
    </div>
  </div>;
}
