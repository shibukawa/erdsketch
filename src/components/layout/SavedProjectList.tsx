import { Clock3, FolderOpen, RotateCcw } from "lucide-react";
import { useCallback, type MouseEvent } from "react";
import type { OpfsProject } from "../../persistence/projectCatalog";

type Props = {
  projects: OpfsProject[];
  activeProjectId?: string;
  disabled: boolean;
  onSelect: (projectId: string) => void;
};

function formattedDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function SavedProjectList({ projects, activeProjectId, disabled, onSelect }: Props) {
  const handleSelect = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    onSelect(event.currentTarget.dataset.projectId!);
  }, [onSelect]);

  if (projects.length === 0) return <p className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">No saved browser projects yet.</p>;

  return <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
    {projects.map((project) => {
      const resume = project.projectId === activeProjectId;
      const Icon = resume ? RotateCcw : FolderOpen;
      return <button type="button" key={project.projectId} data-project-id={project.projectId} className={`flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition hover:border-blue-400 hover:bg-blue-50 disabled:cursor-wait disabled:opacity-60 ${resume ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"}`} disabled={disabled} onClick={handleSelect}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-blue-700"><Icon size={18} /></span>
        <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><strong data-i18n-skip className="truncate">{project.displayName}</strong>{resume && <span className="badge badge-primary badge-sm">Resume</span>}</span><span className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Clock3 size={11} /><span data-i18n-skip>{formattedDate(project.updatedAt)}</span> · {project.kind === "temporary" ? "Temporary" : "Named"}</span></span>
      </button>;
    })}
  </div>;
}
