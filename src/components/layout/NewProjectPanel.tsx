import { useCallback } from "react";
import type { StarterProjectId, StarterProjectSummary } from "../../features/modeling/starterProjects";
import { StarterProjectCard } from "./StarterProjectCard";

type Props = {
  starters: StarterProjectSummary[];
  disabled: boolean;
  run: (action: () => Promise<boolean>) => Promise<boolean>;
  onCreateStarter: (id: StarterProjectId) => Promise<boolean>;
};

export function NewProjectPanel({ starters, disabled, run, onCreateStarter }: Props) {
  const handleStarter = useCallback((id: StarterProjectId) => {
    void run(() => onCreateStarter(id));
  }, [onCreateStarter, run]);

  return <div className="min-h-0 flex-1 overflow-y-auto p-6" role="tabpanel">
    <div>
      <h3 className="text-lg font-bold">New project</h3>
      <p className="mt-1 text-sm text-slate-600">Start blank or explore a complete model with domains, vocabulary, ERD, and DFD.</p>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {starters.map((starter) => <StarterProjectCard key={starter.id} starter={starter} disabled={disabled} onSelect={handleStarter} />)}
    </div>
  </div>;
}
