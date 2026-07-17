import { Database, FileJson, Link2, Menu, Monitor, Play, RadioTower } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FocusEvent, type KeyboardEvent, type PointerEvent } from "react";
import type { CardDisplayMode, DfdNode, ModelSeed } from "../../features/modeling/types";
import { DFD_NODE_SIZE } from "../../features/dfd/dfd";
import { DfdRoughShape } from "./DfdRoughShape";

type Props = {
  node: DfdNode; model?: ModelSeed; selected: boolean; connectionSource: boolean; relationshipDropTarget?: boolean; displayMode: CardDisplayMode;
  onSelect: (id: string) => void;
  onPointerDown: (event: PointerEvent<HTMLElement>, node: DfdNode) => void;
  onLinkPointerDown: (event: PointerEvent<HTMLButtonElement>, node: DfdNode) => void;
  onEditModelFields: (node: DfdNode) => void;
  onUpdateNode: (patch: Partial<DfdNode>) => void;
  onUpdateModel: (patch: Partial<ModelSeed>) => void;
};

export function DfdNodeCard({ node, model, selected, connectionSource, relationshipDropTarget, displayMode, onSelect, onPointerDown, onLinkPointerDown, onEditModelFields, onUpdateNode, onUpdateModel }: Props) {
  const size = DFD_NODE_SIZE[node.kind];
  const title = model?.title ?? node.name;
  const description = model?.description ?? node.description ?? "";
  const [titleDraft, setTitleDraft] = useState(title);
  const [descriptionDraft, setDescriptionDraft] = useState(description);
  const titleEditingRef = useRef(false);
  const descriptionEditingRef = useRef(false);
  const titleCancelRef = useRef(false);
  const descriptionCancelRef = useRef(false);
  useEffect(() => { if (!titleEditingRef.current) setTitleDraft(title); }, [node.id, title]);
  useEffect(() => { if (!descriptionEditingRef.current) setDescriptionDraft(description); }, [description, node.id]);
  const handleClick = useCallback(() => onSelect(node.id), [node.id, onSelect]);
  const handlePointerDown = useCallback((event: PointerEvent<HTMLElement>) => onPointerDown(event, node), [node, onPointerDown]);
  const handleLink = useCallback((event: PointerEvent<HTMLButtonElement>) => onLinkPointerDown(event, node), [node, onLinkPointerDown]);
  const handleFields = useCallback(() => onEditModelFields(node), [node, onEditModelFields]);
  const handleEditablePointerDown = useCallback((event: PointerEvent<HTMLInputElement | HTMLTextAreaElement>) => event.stopPropagation(), []);
  const handleTitleChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setTitleDraft(event.target.value.replace(/\r?\n/g, " "));
  }, []);
  const handleTitleFocus = useCallback(() => { titleEditingRef.current = true; titleCancelRef.current = false; }, []);
  const commitTitle = useCallback(() => {
    const nextTitle = titleDraft.trim();
    if (!nextTitle) {
      setTitleDraft(title);
      return;
    }
    if (nextTitle === title) return;
    setTitleDraft(nextTitle);
    if (model) onUpdateModel({ title: nextTitle });
    else onUpdateNode({ name: nextTitle });
  }, [model, onUpdateModel, onUpdateNode, title, titleDraft]);
  const handleTitleBlur = useCallback((_event: FocusEvent<HTMLTextAreaElement>) => {
    titleEditingRef.current = false;
    if (titleCancelRef.current) {
      titleCancelRef.current = false;
      setTitleDraft(title);
      return;
    }
    commitTitle();
  }, [commitTitle, title]);
  const handleTitleKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      titleCancelRef.current = true;
      setTitleDraft(title);
    }
    if (event.key === "Enter" || event.key === "Escape") {
      event.preventDefault();
      event.currentTarget.blur();
    }
  }, [title]);
  const handleDescriptionChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setDescriptionDraft(event.target.value);
  }, []);
  const handleDescriptionFocus = useCallback(() => { descriptionEditingRef.current = true; descriptionCancelRef.current = false; }, []);
  const handleDescriptionBlur = useCallback((event: FocusEvent<HTMLTextAreaElement>) => {
    descriptionEditingRef.current = false;
    if (descriptionCancelRef.current) {
      descriptionCancelRef.current = false;
      setDescriptionDraft(description);
      return;
    }
    if (event.currentTarget.value === description) return;
    if (model) onUpdateModel({ description: event.currentTarget.value });
    else onUpdateNode({ description: event.currentTarget.value });
  }, [description, model, onUpdateModel, onUpdateNode]);
  const handleDescriptionKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Escape") return;
    descriptionCancelRef.current = true;
    setDescriptionDraft(description);
    event.currentTarget.blur();
  }, [description]);
  const logical = node.kind === "process" && Boolean(node.physicalProcesses?.length);
  const roughness = node.kind === "model" ? model?.maturedLevel ?? 1 : 1;
  const modelKeyFields = model?.fields.filter((field) => field.primaryKey || field.important) ?? [];
  const titleControl = selected ? <textarea data-no-drag="true" rows={2} className="h-9 min-w-0 flex-1 resize-none overflow-hidden bg-transparent text-left text-sm font-bold leading-[1.1] outline-none" value={titleDraft} onFocus={handleTitleFocus} onChange={handleTitleChange} onBlur={handleTitleBlur} onKeyDown={handleTitleKeyDown} onPointerDown={handleEditablePointerDown} aria-label={`${title || "Untitled"} title`} /> : <strong className="line-clamp-2 min-w-0 flex-1 break-words text-left text-sm leading-[1.1]">{title}</strong>;
  const descriptionControl = selected ? <textarea data-no-drag="true" className="h-full w-full resize-none bg-transparent text-left text-[9px] leading-tight text-slate-600 outline-none" value={descriptionDraft} onFocus={handleDescriptionFocus} onChange={handleDescriptionChange} onBlur={handleDescriptionBlur} onKeyDown={handleDescriptionKeyDown} onPointerDown={handleEditablePointerDown} placeholder="Add description" aria-label={`${title || "Untitled"} description`} /> : <p className="line-clamp-4 w-full text-left text-[9px] leading-tight text-slate-600">{description || "No description"}</p>;

  return <article data-dfd-node={node.id} className={`absolute cursor-move select-none text-slate-900 ${connectionSource ? "ring-2 ring-amber-400 ring-offset-2" : ""}`} style={{ left: node.x, top: node.y, width: size.width, height: size.height }} onClick={handleClick} onPointerDown={handlePointerDown}>
    <DfdRoughShape node={node} width={size.width} height={size.height} roughness={roughness} selected={selected} />
    {logical ? <div className="absolute inset-0 z-10 px-5"><div className="flex h-[42px] items-center px-1">{titleControl}</div><div className="flex h-[53px] items-start overflow-hidden px-2 py-2">{displayMode === "description" ? descriptionControl : <ul className="w-full text-left text-[10px] leading-tight">{node.physicalProcesses?.map((physical) => <li key={physical.id}>• {physical.name}</li>)}</ul>}</div></div> : <div className="relative z-10 flex h-full translate-y-1 flex-col justify-center px-7 text-left">
      <div className="flex w-full min-w-0 items-center">{node.kind === "process" && (node.processKind === "ui" ? <Monitor size={20} className="mr-2 shrink-0 text-blue-700" /> : <Play size={20} className="mr-2 shrink-0 text-emerald-700" />)}{node.kind === "model" && <Database size={19} className="mr-2 shrink-0 text-amber-700" />}{node.kind === "intermediate" && (node.intermediateKind === "queue" ? <RadioTower size={19} className="mr-2 shrink-0 text-cyan-700" /> : <FileJson size={19} className="mr-2 shrink-0 text-violet-700" />)}{titleControl}</div>
      <div className="mt-1 h-8 w-full overflow-hidden">{displayMode === "description" ? descriptionControl : model ? modelKeyFields.length > 0 ? <ul className="w-full text-left text-[9px] leading-tight">{modelKeyFields.slice(0, 4).map((field) => <li key={field.id} className="truncate">{field.primaryKey ? "🔑 " : "• "}{field.name}</li>)}</ul> : <span className="text-left text-[9px] uppercase tracking-wide text-slate-500">No key fields</span> : <span className="text-left text-[9px] uppercase tracking-wide text-slate-500">{node.kind === "process" ? node.processKind : node.kind === "intermediate" ? node.format || node.intermediateKind : "External entity"}</span>}</div>
    </div>}
    {selected && node.kind === "model" && <button data-no-drag="true" type="button" className="absolute -top-2 -right-2 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow" aria-label="Edit model fields" onPointerDown={(event) => event.stopPropagation()} onClick={handleFields}><Menu size={15} /></button>}
    {selected && <button data-no-drag="true" type="button" className="absolute -bottom-2 -right-2 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-blue-200 bg-white text-blue-700 shadow-md" aria-label={`Create data flow from ${node.name}`} title="Drag to another item to create a data flow" onPointerDown={handleLink}><Link2 size={16} /></button>}
    {relationshipDropTarget && <span className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-700 px-3 py-1 text-xs font-bold text-white shadow">Release to connect</span>}
  </article>;
}
