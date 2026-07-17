import { BookOpen, CircleHelp, FilePlus2, ListChecks } from "lucide-react";
import { useCallback, type MouseEvent } from "react";
import type { StarterProjectId, StarterProjectSummary } from "../../features/modeling/starterProjects";
import { useI18n } from "../../i18n/I18nProvider";
import { translateText } from "../../i18n/translations";

type Props = {
  starter: StarterProjectSummary;
  disabled: boolean;
  onSelect: (id: StarterProjectId) => void;
};

const icons = {
  empty: FilePlus2,
  todo: ListChecks,
  blog: BookOpen,
  "help-desk": CircleHelp
};

export function StarterProjectCard({ starter, disabled, onSelect }: Props) {
  const Icon = icons[starter.id];
  const { locale } = useI18n();
  const handleSelect = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    onSelect(event.currentTarget.dataset.starterId as StarterProjectId);
  }, [onSelect]);

  return <button type="button" data-starter-id={starter.id} className="group flex min-h-52 flex-col rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-400 hover:bg-blue-50 disabled:cursor-wait disabled:opacity-60" disabled={disabled} onClick={handleSelect}>
    <div className="flex w-full items-start justify-between gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700 group-hover:bg-white"><Icon size={21} /></span><span className="badge badge-ghost badge-sm">{starter.level}</span></div>
    <strong className="mt-3 text-lg">{starter.title}</strong>
    <span className="mt-1 min-h-10 text-sm leading-5 text-slate-600">{starter.description}</span>
    <span className="mt-auto flex flex-wrap gap-1 pt-4 text-[11px] text-slate-600">
      <span className="badge badge-outline badge-sm">{translateText(`${starter.modelCount} models`, locale)}</span>
      <span className="badge badge-outline badge-sm">{translateText(`${starter.domainCount} domains`, locale)}</span>
      <span className="badge badge-outline badge-sm">{translateText(`${starter.vocabularyCount} terms`, locale)}</span>
      <span className="badge badge-outline badge-sm">ERD {starter.erdCanvasCount}</span>
      <span className="badge badge-outline badge-sm">DFD {starter.dfdCanvasCount}</span>
    </span>
  </button>;
}
