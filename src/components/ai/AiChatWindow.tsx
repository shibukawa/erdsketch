import { Bot, CircleStop, PlugZap, Send, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import type { AiChatMessage, AiDesignSuggestion, AiProviderId, AiSurfaceContext, LocalOpenAiConfig } from "../../features/ai/types";

type AiChatWindowProps = {
  surface: AiSurfaceContext;
  messages: AiChatMessage[];
  providerId: AiProviderId;
  localConfig: LocalOpenAiConfig;
  localModels: string[];
  providerLabel: string;
  modelLabel: string;
  generating: boolean;
  streamingText: string;
  status?: string;
  error?: string;
  suggestions: Record<string, AiDesignSuggestion[]>;
  composerRef: RefObject<HTMLTextAreaElement | null>;
  onProviderChange: (provider: AiProviderId) => void;
  onLocalConfigChange: (config: LocalOpenAiConfig) => void;
  onTest: () => void;
  onSend: (instruction: string) => void;
  onCancel: () => void;
  onClear: () => void;
  onClose: () => void;
};

function SuggestionCard({ suggestion }: { suggestion: AiDesignSuggestion }) {
  return <article className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
    <div className="flex items-start justify-between gap-3"><strong data-i18n-skip>{suggestion.title}</strong><span className="badge badge-sm badge-outline">{suggestion.kind.replace("_", " ")}</span></div>
    <p data-i18n-skip className="mt-1 text-slate-700">{suggestion.rationale}</p>
    {suggestion.proposedValue && <p data-i18n-skip className="mt-2 font-mono text-xs text-blue-900">{suggestion.proposedValue}</p>}
    {suggestion.tradeoffs.length > 0 && <p className="mt-2 text-xs text-slate-600">Tradeoffs: <span data-i18n-skip>{suggestion.tradeoffs.join(" · ")}</span></p>}
    {suggestion.alternatives.length > 0 && <p className="mt-1 text-xs text-slate-600">Alternatives: <span data-i18n-skip>{suggestion.alternatives.join(" · ")}</span></p>}
  </article>;
}

export function AiChatWindow({ surface, messages, providerId, localConfig, localModels, providerLabel, modelLabel, generating, streamingText, status, error, suggestions, composerRef, onProviderChange, onLocalConfigChange, onTest, onSend, onCancel, onClear, onClose }: AiChatWindowProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (generating || streamingText) messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [generating, messages.length, streamingText]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const instruction = input.trim();
    if (!instruction || generating) return;
    setInput("");
    onSend(instruction);
  }

  return <aside data-ai-assistant role="dialog" aria-modal="false" aria-labelledby="ai-assistant-title" className="fixed bottom-4 right-4 top-4 z-[200] flex w-[min(430px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-2xl">
    <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
      <div className="min-w-0"><div className="flex items-center gap-2"><Bot className="text-blue-600" size={20} /><h2 id="ai-assistant-title" className="font-bold">AI assistant</h2></div><p data-i18n-skip className="mt-1 truncate text-xs text-slate-500">{surface.title}</p></div>
      <div className="flex gap-1"><button type="button" className="btn btn-ghost btn-sm btn-square" onClick={onClear} aria-label="Clear this chat" title="Clear this chat"><Trash2 size={17} /></button><button type="button" className="btn btn-ghost btn-sm btn-square" onClick={onClose} aria-label="Close AI assistant"><X size={18} /></button></div>
    </header>

    <section className="space-y-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm">
      <label className="grid gap-1"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">Provider</span><select className="select select-bordered select-sm w-full bg-white" value={providerId} onChange={(event) => onProviderChange(event.target.value as AiProviderId)}><option value="browser">Chrome built-in AI</option><option value="local-openai">Local OpenAI-compatible server</option></select></label>
      {providerId === "local-openai" && <div className="grid grid-cols-[1fr_9rem] gap-2"><label className="grid gap-1"><span className="text-xs font-medium text-slate-600">Server URL</span><input className="input input-bordered input-sm min-w-0 bg-white" type="url" value={localConfig.baseUrl} placeholder="http://127.0.0.1:1234" onChange={(event) => onLocalConfigChange({ ...localConfig, baseUrl: event.target.value })} /></label><label className="grid gap-1"><span className="text-xs font-medium text-slate-600">Model</span><select className="select select-bordered select-sm min-w-0 bg-white" value={localConfig.model} disabled={localModels.length === 0} onChange={(event) => onLocalConfigChange({ ...localConfig, model: event.target.value })}>{localModels.length === 0 && <option value="">Test connection to load models</option>}{localModels.map((model) => <option data-i18n-skip key={model} value={model}>{model}</option>)}</select></label></div>}
      <div className="flex items-center justify-between gap-2"><div className="min-w-0"><p className="truncate text-xs font-medium">{providerLabel} · {providerId === "local-openai" && localConfig.model ? <span data-i18n-skip>{modelLabel}</span> : modelLabel}</p>{status && <p className="truncate text-xs text-emerald-700">{status}</p>}</div><button type="button" className="btn btn-outline btn-xs shrink-0 gap-1" onClick={onTest} disabled={generating}><PlugZap size={14} />Test</button></div>
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"><strong>Context:</strong> {surface.kind.replace("-", " ")} · <span data-i18n-skip>{surface.title}</span>{surface.selectedModelIds?.length ? ` · ${surface.selectedModelIds.length} model(s)` : ""}<p className="mt-1">Project context is sent only when you press Send.</p></div>
    </section>

    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
      {messages.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600"><p className="font-medium text-slate-800">Ask about the current model or canvas.</p><p className="mt-1">For example: “Recommend types for these fields” or “Should this model be split?”</p></div>}
      {messages.map((message) => <div key={message.id} className={message.role === "user" ? "ml-10 rounded-2xl rounded-br-sm bg-blue-600 px-4 py-3 text-sm text-white" : "mr-6 rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-3 text-sm text-slate-800"}><p data-i18n-skip className="whitespace-pre-wrap break-words">{message.text}</p>{suggestions[message.id]?.map((suggestion) => <SuggestionCard key={suggestion.id} suggestion={suggestion} />)}</div>)}
      {(generating || streamingText) && <div className="mr-6 rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-3 text-sm text-slate-800">
        {streamingText
          ? <p className="whitespace-pre-wrap break-words"><span data-i18n-skip>{streamingText}</span><span className="ml-0.5 inline-block animate-pulse text-blue-600" aria-hidden="true">▍</span></p>
          : <div className="flex items-center gap-2 text-slate-500" role="status"><span>Thinking…</span><span className="loading loading-dots loading-xs" aria-hidden="true" /></div>}
      </div>}
      {error && <div data-i18n-skip role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div ref={messagesEndRef} />
    </div>

    <form className="border-t border-slate-200 p-3" onSubmit={handleSubmit}><textarea ref={composerRef} className="textarea textarea-bordered min-h-20 w-full resize-none bg-white" value={input} placeholder="Ask AI about this design…" onChange={(event) => setInput(event.target.value)} /><div className="mt-2 flex justify-end">{generating ? <button type="button" className="btn btn-outline btn-sm gap-2" onClick={onCancel}><CircleStop size={16} />Cancel</button> : <button type="submit" className="btn btn-primary btn-sm gap-2" disabled={!input.trim()}><Send size={16} />Send</button>}</div></form>
  </aside>;
}
