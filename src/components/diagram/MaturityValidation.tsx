import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useCallback, type MouseEvent } from "react";
import type { ModelMaturityAssessment, ModelMaturityIssue } from "../../features/modeling/maturity";

type Props = {
  assessment: ModelMaturityAssessment;
  onResolve: (issue: ModelMaturityIssue) => void;
};

const stageLabels = { seed: "Seed", concept: "Concept", logical: "Logical", matured: "Matured" } as const;

export function MaturityValidation({ assessment, onResolve }: Props) {
  const handleResolve = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const issue = assessment.issues.find((item) => item.id === event.currentTarget.dataset.issueId);
    if (issue) onResolve(issue);
  }, [assessment.issues, onResolve]);

  return <div className="rounded-lg border border-slate-200 bg-white p-3">
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-semibold text-slate-500">Current maturity</span>
      <span className="badge badge-sm badge-neutral">{stageLabels[assessment.stage]}</span>
    </div>
    {assessment.stage === "matured" ? <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-700"><CheckCircle2 size={15}/>Maturity requirements are complete.</p> : <>
      <p className="mt-3 text-xs text-slate-600">Required for {stageLabels[assessment.nextStage!]}:</p>
      <ul className="mt-2 space-y-2">
        {assessment.issues.map((issue) => <li key={issue.id} className="rounded-md bg-amber-50 px-2.5 py-2 text-xs text-amber-950">
          <div className="flex gap-2"><AlertCircle className="mt-0.5 shrink-0 text-amber-600" size={14}/><div className="min-w-0"><p className="truncate font-bold">{issue.label}</p><p className="mt-0.5 leading-relaxed text-amber-800">{issue.detail}</p></div></div>
          {(issue.kind === "missing-domain" || issue.kind === "missing-vocabulary-name") && <button type="button" data-issue-id={issue.id} className="mt-1.5 text-xs font-bold text-blue-700 hover:underline" onClick={handleResolve}>Open settings</button>}
        </li>)}
      </ul>
    </>}
  </div>;
}
