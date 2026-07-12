import { BookOpen, ChevronRight, Download, GripVertical, Plus, Trash2, Upload, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type FocusEvent, type KeyboardEvent, type MouseEvent, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import type { CodeSetBaseType, CodeSetEntry, DataDomain, DomainCategory, DomainCategoryBundle, DomainShape, NameDisplayMode, PrimitiveType } from "../../features/modeling/types";
import { isAssignableDomain, updateNameSet } from "../../features/modeling/utils";
import { CodeSetEditor } from "./CodeSetEditor";
import { NameModeControl } from "./NameModeControl";
import { getCachedDisplayName, type VocabularyMatchCache } from "../../features/modeling/vocabulary";
import { VocabularyDisplayName } from "./VocabularyDisplayName";

type DomainAssignmentTarget = {
  label: string;
  fieldId: string;
};

type DomainDictionaryDialogProps = {
  domains: DataDomain[];
  categories: DomainCategory[];
  canEdit: boolean;
  initialNameDisplayMode: NameDisplayMode;
  vocabularyCache: VocabularyMatchCache;
  assignmentTarget?: DomainAssignmentTarget;
  onChange: (domain: DataDomain) => void;
  onCreateDomain: (name: string, categoryId: string) => void;
  onCreateCategory: (name: string) => void;
  onChangeCategory: (category: DomainCategory) => void;
  onImportCategory: (bundle: DomainCategoryBundle) => void;
  onDelete: (domain: DataDomain) => void;
  onAssign: (domainId: string) => void;
  onClose: () => void;
};

const primitiveLabels: Record<PrimitiveType, string> = {
  integer: "Integer",
  decimal: "Decimal",
  floating_point: "Floating point",
  varchar: "Varchar",
  text: "Text",
  blob: "Blob",
  date: "Date",
  time: "Time",
  datetime: "Datetime",
  datetime_with_timezone: "Datetime with timezone",
  boolean: "Boolean",
  uuid: "UUID",
  code_set: "Code Set"
};

const primitiveTypes = Object.keys(primitiveLabels) as PrimitiveType[];

function domainTypeSummary(domain: DataDomain) {
  if (domain.shape === "unresolved") return "undefined";
  if (domain.shape === "composite") return domain.components.length ? `${domain.components.length} fields` : "empty";
  const primitive = domain.primitiveType ? primitiveLabels[domain.primitiveType] : "undefined";
  if (domain.primitiveType === "integer" || domain.primitiveType === "floating_point") return domain.bits ? `${primitive} · ${domain.bits} bit` : primitive;
  if (domain.primitiveType === "varchar") return domain.length ? `${primitive}(${domain.length})` : primitive;
  if (domain.primitiveType === "decimal") return domain.precision ? `${primitive}(${domain.precision}, ${domain.scale ?? 0})` : primitive;
  if (domain.primitiveType === "code_set") return `${primitive} · ${domain.codeSetBaseType ?? "varchar"} · ${domain.codeSetEntries?.length ?? 0} codes`;
  return primitive;
}

function createComponent(name: string) {
  return { id: crypto.randomUUID(), name, required: true, description: "", partitionKey: false };
}

export function DomainDictionaryDialog({ domains, categories, canEdit, initialNameDisplayMode, vocabularyCache, assignmentTarget, onChange, onCreateDomain, onCreateCategory, onChangeCategory, onImportCategory, onDelete, onAssign, onClose }: DomainDictionaryDialogProps) {
  const dialogRef = useState<HTMLDialogElement | null>(null);
  const [dialog, setDialog] = dialogRef;
  const [categoryId, setCategoryId] = useState("user-defined");
  const [query, setQuery] = useState("");
  const [domainQuickEntry, setDomainQuickEntry] = useState("");
  const [categoryQuickEntry, setCategoryQuickEntry] = useState("");
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [componentQuickEntry, setComponentQuickEntry] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [draggingComponentId, setDraggingComponentId] = useState<string | null>(null);
  const [componentDropTargetId, setComponentDropTargetId] = useState<string | null>(null);
  const [categoryDropTargetId, setCategoryDropTargetId] = useState<string | null>(null);
  const [nameDisplayMode, setNameDisplayMode] = useState(initialNameDisplayMode);
  const categoryImportRef = useRef<HTMLInputElement | null>(null);
  const filteredDomains = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return domains.filter((domain) => {
      if (domain.categoryId !== categoryId) return false;
      return !normalized || [domain.name, domain.primitiveType ?? "", ...domain.components.map((component) => component.name)].some((value) => value.toLowerCase().includes(normalized));
    });
  }, [categoryId, domains, query]);
  const selectedDomain = useMemo(() => domains.find((domain) => domain.id === selectedDomainId), [domains, selectedDomainId]);
  const selectedCategory = useMemo(() => categories.find((category) => category.id === categoryId), [categories, categoryId]);
  const componentCandidates = useMemo(() => domains.filter((domain) => (domain.shape === "scalar" || domain.shape === "primitive") && domain.id !== selectedDomain?.id), [domains, selectedDomain?.id]);

  useEffect(() => {
    if (dialog && !dialog.open) dialog.showModal();
  }, [dialog]);

  useEffect(() => {
    if (selectedDomainId && !selectedDomain) setSelectedDomainId(null);
  }, [selectedDomain, selectedDomainId]);

  useEffect(() => {
    if (!categories.some((category) => category.id === categoryId)) setCategoryId("user-defined");
  }, [categories, categoryId]);

  const updateSelected = useCallback((patch: Partial<DataDomain>) => {
    if (selectedDomain && canEdit && !selectedDomain.system) onChange({ ...selectedDomain, ...patch });
  }, [canEdit, onChange, selectedDomain]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleCancel = useCallback((event: SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    onClose();
  }, [onClose]);

  const handleBackdropClick = useCallback((event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) onClose();
  }, [onClose]);

  const handleCategoryClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const nextCategoryId = event.currentTarget.dataset.categoryId ?? "user-defined";
    if (nextCategoryId === categoryId && !categories.find((category) => category.id === nextCategoryId)?.system) setEditingCategoryId(nextCategoryId);
    else setEditingCategoryId(null);
    setCategoryId(nextCategoryId);
    setSelectedDomainId(null);
  }, [categories, categoryId]);

  const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  }, []);

  const handleDomainQuickEntryChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setDomainQuickEntry(event.target.value);
  }, []);

  const handleDomainQuickEntryKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    const name = domainQuickEntry.trim();
    if (!canEdit || !name || selectedCategory?.system) return;
    onCreateDomain(name, categoryId);
    setDomainQuickEntry("");
  }, [canEdit, categoryId, domainQuickEntry, onCreateDomain, selectedCategory?.system]);

  const handleCategoryQuickEntryChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setCategoryQuickEntry(event.target.value);
  }, []);

  const handleCategoryQuickEntryKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    const name = categoryQuickEntry.trim();
    if (!canEdit || !name) return;
    onCreateCategory(name);
    setCategoryQuickEntry("");
  }, [canEdit, categoryQuickEntry, onCreateCategory]);

  const handleCategoryNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const category = categories.find((item) => item.id === event.currentTarget.dataset.categoryId);
    if (category && !category.system) onChangeCategory({ ...category, name: event.target.value });
  }, [categories, onChangeCategory]);

  const handleCategoryNameKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === "Escape") {
      event.preventDefault();
      setEditingCategoryId(null);
    }
  }, []);

  const handleCategoryNameBlur = useCallback(() => setEditingCategoryId(null), []);

  const handleExportCategory = useCallback(() => {
    if (!selectedCategory) return;
    const bundle: DomainCategoryBundle = { version: 1, category: { name: selectedCategory.name }, domains: domains.filter((domain) => domain.categoryId === selectedCategory.id) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${selectedCategory.name.replace(/[^a-z0-9_-]+/gi, "-") || "domain-category"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [domains, selectedCategory]);

  const handleImportClick = useCallback(() => categoryImportRef.current?.click(), []);

  const handleImportCategory = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const bundle = JSON.parse(await file.text()) as DomainCategoryBundle;
      if (bundle.version !== 1 || !bundle.category?.name?.trim() || !Array.isArray(bundle.domains) || bundle.domains.some((domain) => !domain?.id || !domain?.name || !Array.isArray(domain.components))) throw new Error("invalid bundle");
      onImportCategory(bundle);
    } catch {
      window.alert("The selected file is not a valid domain category JSON file.");
    }
  }, [onImportCategory]);

  const handleDomainSelect = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    setSelectedDomainId(event.currentTarget.dataset.domainId ?? null);
  }, []);

  const handleDomainDragStart = useCallback((event: DragEvent<HTMLButtonElement>) => {
    event.dataTransfer.effectAllowed = "copyMove";
    event.dataTransfer.setData("application/x-erdsketch-domain-id", event.currentTarget.dataset.domainId ?? "");
  }, []);

  const handleCategoryDragOver = useCallback((event: DragEvent<HTMLButtonElement>) => {
    const targetId = event.currentTarget.dataset.categoryId;
    const target = categories.find((category) => category.id === targetId);
    if (!canEdit || !target || target.system || !event.dataTransfer.types.includes("application/x-erdsketch-domain-id")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setCategoryDropTargetId(target.id);
  }, [canEdit, categories]);

  const handleCategoryDrop = useCallback((event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const targetId = event.currentTarget.dataset.categoryId;
    const domainId = event.dataTransfer.getData("application/x-erdsketch-domain-id");
    const target = categories.find((category) => category.id === targetId);
    const domain = domains.find((item) => item.id === domainId);
    setCategoryDropTargetId(null);
    if (!canEdit || !target || target.system || !domain || domain.system || domain.categoryId === target.id) return;
    onChange({ ...domain, categoryId: target.id });
    setCategoryId(target.id);
    setSelectedDomainId(domain.id);
  }, [canEdit, categories, domains, onChange]);

  const handleDomainDragEnd = useCallback(() => setCategoryDropTargetId(null), []);

  const handleNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    if (selectedDomain) updateSelected({ names: updateNameSet(selectedDomain.name, selectedDomain.names, "business", event.target.value), vocabularyBinding: undefined });
  }, [selectedDomain, updateSelected]);

  const handleKindChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    const shape = event.target.value as DomainShape;
    if (shape === "unresolved") {
      updateSelected({ shape, primitiveType: undefined, bits: undefined, length: undefined, precision: undefined, scale: undefined, codeSetBaseType: undefined, codeSetEntries: undefined, components: [], partitionKey: false });
      return;
    }
    if (shape === "composite") {
      updateSelected({ shape, primitiveType: undefined, bits: undefined, length: undefined, precision: undefined, scale: undefined, codeSetBaseType: undefined, codeSetEntries: undefined, components: selectedDomain?.components ?? [], partitionKey: false });
      return;
    }
    updateSelected({ shape: "scalar", primitiveType: selectedDomain?.primitiveType ?? "varchar", components: [] });
  }, [selectedDomain?.components, selectedDomain?.primitiveType, updateSelected]);

  const handlePrimitiveChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    const primitiveType = event.target.value as PrimitiveType;
    updateSelected({
      shape: "scalar",
      primitiveType,
      components: [],
      codeSetBaseType: primitiveType === "code_set" ? selectedDomain?.codeSetBaseType ?? "varchar" : undefined,
      codeSetEntries: primitiveType === "code_set" ? selectedDomain?.codeSetEntries ?? [] : undefined
    });
  }, [selectedDomain?.codeSetBaseType, selectedDomain?.codeSetEntries, updateSelected]);

  const handleCodeSetChange = useCallback((codeSetBaseType: CodeSetBaseType, codeSetEntries: CodeSetEntry[]) => {
    updateSelected({ codeSetBaseType, codeSetEntries });
  }, [updateSelected]);

  const handleNumberChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const key = event.currentTarget.dataset.parameter as "length" | "precision" | "scale";
    const value = Number(event.target.value);
    updateSelected({ [key]: Number.isFinite(value) && value >= 0 ? value : undefined });
  }, [updateSelected]);

  const handleBitsChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    updateSelected({ bits: Number(event.target.value) as 8 | 16 | 32 | 64 });
  }, [updateSelected]);

  const handleUnsignedChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    updateSelected({ unsigned: event.target.checked });
  }, [updateSelected]);

  const handlePartitionKeyChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    updateSelected({ partitionKey: event.target.checked });
  }, [updateSelected]);

  const handleComponentQuickEntryChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setComponentQuickEntry(event.target.value);
  }, []);

  const handleComponentQuickEntryKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    const name = componentQuickEntry.trim();
    if (!selectedDomain || !canEdit || !name) return;
    if (selectedDomain.components.some((component) => component.name === name)) {
      window.alert("Component names must be unique within a multi-field domain.");
      return;
    }
    updateSelected({ components: [...selectedDomain.components, createComponent(name)] });
    setComponentQuickEntry("");
  }, [canEdit, componentQuickEntry, selectedDomain, updateSelected]);

  const handleRemoveComponent = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const componentId = event.currentTarget.dataset.componentId;
    if (selectedDomain && componentId) updateSelected({ components: selectedDomain.components.filter((component) => component.id !== componentId) });
  }, [selectedDomain, updateSelected]);

  const handleComponentNameCommit = useCallback((event: FocusEvent<HTMLInputElement>) => {
    const componentId = event.currentTarget.dataset.componentId;
    if (!selectedDomain || !componentId) return;
    const current = selectedDomain.components.find((component) => component.id === componentId);
    const name = event.currentTarget.value.trim();
    if (!current) return;
    if (!name || selectedDomain.components.some((component) => component.id !== componentId && component.name === name)) {
      event.currentTarget.value = current.name;
      window.alert("Component names must be non-empty and unique within a multi-field domain.");
      return;
    }
    if (name !== current.name) updateSelected({ components: selectedDomain.components.map((component) => component.id === componentId ? { ...component, name } : component) });
  }, [selectedDomain, updateSelected]);

  const handleComponentDescriptionCommit = useCallback((event: FocusEvent<HTMLInputElement>) => {
    const componentId = event.currentTarget.dataset.componentId;
    if (selectedDomain && componentId) updateSelected({ components: selectedDomain.components.map((component) => component.id === componentId ? { ...component, description: event.currentTarget.value.trim() } : component) });
  }, [selectedDomain, updateSelected]);

  const handleComponentInputKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") event.currentTarget.blur();
  }, []);

  const handleComponentTypeChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    const componentId = event.currentTarget.dataset.componentId;
    if (selectedDomain && componentId) updateSelected({ components: selectedDomain.components.map((component) => component.id === componentId ? { ...component, domainId: event.target.value || undefined } : component) });
  }, [selectedDomain, updateSelected]);

  const handleComponentRequiredChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const componentId = event.currentTarget.dataset.componentId;
    if (selectedDomain && componentId) updateSelected({ components: selectedDomain.components.map((component) => component.id === componentId ? { ...component, required: event.target.checked } : component) });
  }, [selectedDomain, updateSelected]);

  const handleComponentPartitionKeyChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const componentId = event.currentTarget.dataset.componentId;
    if (selectedDomain && componentId) updateSelected({ components: selectedDomain.components.map((component) => component.id === componentId ? { ...component, partitionKey: event.target.checked } : component) });
  }, [selectedDomain, updateSelected]);

  const handleComponentDragStart = useCallback((event: DragEvent<HTMLSpanElement>) => {
    const componentId = event.currentTarget.dataset.componentId ?? "";
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-erdsketch-component-id", componentId);
    setDraggingComponentId(componentId);
  }, []);

  const handleComponentDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes("application/x-erdsketch-component-id")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setComponentDropTargetId(event.currentTarget.dataset.componentId ?? null);
  }, []);

  const clearComponentDrag = useCallback(() => {
    setDraggingComponentId(null);
    setComponentDropTargetId(null);
  }, []);

  const handleComponentDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const sourceId = draggingComponentId ?? event.dataTransfer.getData("application/x-erdsketch-component-id");
    const targetId = event.currentTarget.dataset.componentId;
    if (!selectedDomain || !sourceId || !targetId || sourceId === targetId) {
      clearComponentDrag();
      return;
    }
    const source = selectedDomain.components.find((component) => component.id === sourceId);
    const remaining = selectedDomain.components.filter((component) => component.id !== sourceId);
    const targetIndex = remaining.findIndex((component) => component.id === targetId);
    if (source && targetIndex >= 0) updateSelected({ components: [...remaining.slice(0, targetIndex), source, ...remaining.slice(targetIndex)] });
    clearComponentDrag();
  }, [clearComponentDrag, draggingComponentId, selectedDomain, updateSelected]);

  const handleAssign = useCallback(() => {
    if (selectedDomain && isAssignableDomain(selectedDomain) && assignmentTarget) onAssign(selectedDomain.id);
  }, [assignmentTarget, onAssign, selectedDomain]);

  const handleDelete = useCallback(() => {
    if (selectedDomain && canEdit && !selectedDomain.system) onDelete(selectedDomain);
  }, [canEdit, onDelete, selectedDomain]);

  return createPortal(
    <dialog ref={setDialog} className="domain-dictionary-dialog m-auto h-[min(90vh,860px)] w-[min(96vw,1420px)] rounded-xl border border-slate-200 bg-white p-0 text-slate-950 shadow-2xl" aria-labelledby="domain-dictionary-title" onCancel={handleCancel} onClose={handleClose} onClick={handleBackdropClick}>
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3"><BookOpen className="text-blue-700" size={22} /><div><h2 id="domain-dictionary-title" className="text-xl font-bold">Domain dictionary</h2><p className="text-xs text-slate-500">Define reusable types and multi-field domains.</p></div></div>
          <div className="flex items-center gap-3"><div className="w-64"><NameModeControl value={nameDisplayMode} onChange={setNameDisplayMode} compact /></div><button type="button" className="btn btn-ghost btn-sm btn-square" aria-label="Close domain dictionary" onClick={handleClose}><X size={18} /></button></div>
        </header>
        <div className="grid min-h-0 flex-1 grid-cols-[190px_minmax(300px,0.9fr)_minmax(420px,1.2fr)]">
          <nav className="flex min-h-0 flex-col border-r border-slate-200 bg-slate-50 p-3" aria-label="Domain categories">
            <p className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Categories</p>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">{categories.map((item) => editingCategoryId === item.id ? <input key={item.id} autoFocus data-category-id={item.id} className="input input-bordered input-sm w-full bg-white" value={item.name} onChange={handleCategoryNameChange} onKeyDown={handleCategoryNameKeyDown} onBlur={handleCategoryNameBlur} disabled={!canEdit} aria-label="Edit category name" /> : <button key={item.id} type="button" data-category-id={item.id} className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-semibold ${categoryDropTargetId === item.id ? "bg-emerald-100 text-emerald-900 ring-2 ring-emerald-400" : categoryId === item.id ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-white"}`} onClick={handleCategoryClick} onDragOver={handleCategoryDragOver} onDrop={handleCategoryDrop}>{item.name}<ChevronRight size={14} /></button>)}</div>
            <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" className="btn btn-outline btn-xs" onClick={handleExportCategory} disabled={!selectedCategory}><Download size={13} />Export</button><button type="button" className="btn btn-outline btn-xs" onClick={handleImportClick} disabled={!canEdit}><Upload size={13} />Import</button><input ref={categoryImportRef} type="file" className="hidden" accept=".json,application/json" onChange={(event) => void handleImportCategory(event)} /></div>
            <label className="mt-3 block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Add category</span><input className="input input-bordered intent-add input-sm w-full" value={categoryQuickEntry} onChange={handleCategoryQuickEntryChange} onKeyDown={handleCategoryQuickEntryKeyDown} disabled={!canEdit} placeholder="Name + Enter" aria-label="New domain category" /></label>
          </nav>
          <section className="flex min-h-0 flex-col border-r border-slate-200" aria-label="Domain list">
            <div className="space-y-2 border-b border-slate-200 p-4"><input className="input input-bordered intent-search h-10 w-full text-sm" value={query} onChange={handleSearchChange} placeholder="Search domains" aria-label="Search domains" />{selectedCategory?.system ? <p className="px-1 text-xs text-slate-500">Built-in generic domains are fixed.</p> : <input className="input input-bordered intent-add h-10 w-full text-sm" value={domainQuickEntry} onChange={handleDomainQuickEntryChange} onKeyDown={handleDomainQuickEntryKeyDown} disabled={!canEdit} placeholder="Add domain name + Enter" aria-label="New dictionary domain name" />}</div>
            <ul className="min-h-0 flex-1 overflow-y-auto p-2">
              {filteredDomains.map((domain) => <li key={domain.id}><button type="button" data-domain-id={domain.id} draggable={isAssignableDomain(domain)} className={`flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left ${selectedDomainId === domain.id ? "bg-blue-50 text-blue-950" : "hover:bg-slate-50"}`} onClick={handleDomainSelect} onDragStart={handleDomainDragStart} onDragEnd={handleDomainDragEnd}><GripVertical size={15} className="shrink-0 text-slate-400" /><span className="min-w-0 flex-1 truncate font-mono text-xs font-semibold"><VocabularyDisplayName cache={vocabularyCache} cacheKey={`domain:${domain.id}`} legacyName={domain.name} names={domain.names} mode={nameDisplayMode} /></span><span className="shrink-0 text-[10px] text-slate-500">{domainTypeSummary(domain)}</span></button></li>)}
              {filteredDomains.length === 0 && <li className="px-3 py-8 text-center text-sm text-slate-500">No domains in this category.</li>}
            </ul>
          </section>
          <section className="min-h-0 overflow-y-auto bg-slate-50 p-6" aria-label="Domain details">
            {!selectedDomain ? <p className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm leading-6 text-slate-500">Choose a domain from the list. New names added from a field list begin here as undefined.</p> : <div className="space-y-5">
              <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{categories.find((category) => category.id === selectedDomain.categoryId)?.name ?? "User Defined"}</p><h3 className="mt-1 font-mono text-lg font-bold"><VocabularyDisplayName cache={vocabularyCache} cacheKey={`domain:${selectedDomain.id}`} legacyName={selectedDomain.name} names={selectedDomain.names} mode={nameDisplayMode} /></h3></div>{assignmentTarget && <button type="button" className="btn btn-primary btn-sm" disabled={!isAssignableDomain(selectedDomain)} onClick={handleAssign}>Assign to {assignmentTarget.label}</button>}</div>
              {!selectedDomain.system && <label className="flex flex-col"><span className="mb-1 text-xs font-bold text-slate-600">Business source name</span><input className="input input-bordered w-full bg-white" value={selectedDomain.names?.business || selectedDomain.name} onChange={handleNameChange} disabled={!canEdit} /></label>}
              {!selectedDomain.system && <label className="flex flex-col"><span className="mb-1 text-xs font-bold text-slate-600">Definition</span><select className="select select-bordered w-full bg-white" value={selectedDomain.shape} onChange={handleKindChange} disabled={!canEdit}><option value="unresolved">Undefined</option><option value="scalar">Single field</option><option value="composite">Multi-field</option></select></label>}
              {selectedDomain.shape === "unresolved" && <label className="flex flex-col"><span className="mb-1 text-xs font-bold text-slate-600">Define as primitive type</span><select className="select select-bordered w-full bg-white" value="" onChange={handlePrimitiveChange} disabled={!canEdit}><option value="">Choose a type…</option>{primitiveTypes.map((primitive) => <option key={primitive} value={primitive}>{primitiveLabels[primitive]}</option>)}</select><span className="mt-2 text-xs text-slate-500">Undefined keeps the domain identity while its physical type is still undecided.</span></label>}
              {selectedDomain.shape === "composite" && (
                <div className="space-y-3">
                  <div><p className="text-sm font-bold text-slate-700">Components</p><p className="mt-1 text-xs text-slate-500">Enter member names first, then choose undefined, a primitive type, or a single-field domain. Drag rows to reorder; multi-field nesting is not allowed.</p></div>
                  <label className="input input-bordered flex h-10 items-center gap-2 bg-white"><Plus size={15} className="text-slate-400" /><input className="min-w-0 grow text-sm" value={componentQuickEntry} onChange={handleComponentQuickEntryChange} onKeyDown={handleComponentQuickEntryKeyDown} disabled={!canEdit} placeholder="Add component name + Enter" aria-label="New multi-field component name" /><kbd className="kbd kbd-sm bg-slate-50 text-slate-500">Enter</kbd></label>
                  {selectedDomain.components.map((component, index) => (
                    <div key={component.id} data-component-id={component.id} className={`space-y-2 rounded-md border bg-white p-3 ${componentDropTargetId === component.id ? "border-blue-500 ring-2 ring-blue-200" : "border-slate-200"} ${draggingComponentId === component.id ? "opacity-40" : ""}`} onDragOver={handleComponentDragOver} onDrop={handleComponentDrop}>
                      <div className="flex items-center gap-2"><span className="cursor-grab text-slate-300 active:cursor-grabbing" data-component-id={component.id} draggable={canEdit} onDragStart={handleComponentDragStart} onDragEnd={clearComponentDrag} aria-label={`Drag ${component.name} to reorder`}><GripVertical size={15} /></span><input key={`${component.id}:${component.name}`} className="input input-bordered input-sm min-w-0 flex-1 bg-white font-mono text-xs font-semibold" data-component-id={component.id} defaultValue={component.name} onBlur={handleComponentNameCommit} onKeyDown={handleComponentInputKeyDown} disabled={!canEdit} aria-label={`Component ${index + 1} name`} /><button type="button" className="btn btn-ghost btn-xs btn-square text-red-600" data-component-id={component.id} onClick={handleRemoveComponent} disabled={!canEdit} aria-label={`Remove ${component.name}`}><Trash2 size={14} /></button></div>
                      <select className="select select-bordered select-sm w-full bg-white" data-component-id={component.id} value={component.domainId ?? ""} onChange={handleComponentTypeChange} disabled={!canEdit} aria-label={`${component.name} type`}><option value="">Undefined</option>{componentCandidates.map((domain) => <option key={domain.id} value={domain.id}>{getCachedDisplayName(vocabularyCache, `domain:${domain.id}`, domain.name, domain.names, nameDisplayMode)}</option>)}</select>
                      <div className="flex flex-wrap items-center gap-3"><input key={`${component.id}:${component.description ?? ""}`} className="input input-bordered input-sm min-w-[160px] flex-1 bg-white text-xs" data-component-id={component.id} defaultValue={component.description ?? ""} onBlur={handleComponentDescriptionCommit} onKeyDown={handleComponentInputKeyDown} disabled={!canEdit} placeholder="Description" aria-label={`${component.name} description`} /><label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" className="checkbox checkbox-sm" data-component-id={component.id} checked={component.required} onChange={handleComponentRequiredChange} disabled={!canEdit} />Required</label><label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs font-semibold text-cyan-800"><input type="checkbox" className="checkbox checkbox-sm checkbox-info" data-component-id={component.id} checked={component.partitionKey ?? false} onChange={handleComponentPartitionKeyChange} disabled={!canEdit} />Partition key</label></div>
                    </div>
                  ))}
                  {selectedDomain.components.length === 0 && <p className="rounded-md border border-dashed border-slate-300 bg-white px-3 py-4 text-center text-xs text-slate-500">No components yet. Add names above; types can stay undefined.</p>}
                </div>
              )}
              {(selectedDomain.shape === "primitive" || selectedDomain.shape === "scalar") && <div className="space-y-4"><label className="flex cursor-pointer items-center gap-2 rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-900"><input type="checkbox" className="checkbox checkbox-info" checked={selectedDomain.partitionKey ?? false} onChange={handlePartitionKeyChange} disabled={!canEdit || selectedDomain.system} />Partition key</label><label className="flex flex-col"><span className="mb-1 text-xs font-bold text-slate-600">Primitive type</span><select className="select select-bordered w-full bg-white" value={selectedDomain.primitiveType ?? "varchar"} onChange={handlePrimitiveChange} disabled={!canEdit || selectedDomain.system}>{primitiveTypes.map((primitive) => <option key={primitive} value={primitive}>{primitiveLabels[primitive]}</option>)}</select></label>{(selectedDomain.primitiveType === "integer" || selectedDomain.primitiveType === "floating_point") && <label className="flex flex-col"><span className="mb-1 text-xs font-bold text-slate-600">Bits</span><select className="select select-bordered w-full bg-white" value={selectedDomain.bits ?? 32} onChange={handleBitsChange} disabled={!canEdit || selectedDomain.system}><option value={8}>8 bit</option><option value={16}>16 bit</option><option value={32}>32 bit</option><option value={64}>64 bit / bigint</option></select></label>}{selectedDomain.primitiveType === "integer" && <label className="label cursor-pointer justify-start gap-2"><input type="checkbox" className="checkbox" checked={selectedDomain.unsigned ?? false} onChange={handleUnsignedChange} disabled={!canEdit || selectedDomain.system} /><span className="label-text">Unsigned</span></label>}{selectedDomain.primitiveType === "varchar" && <label className="flex flex-col"><span className="mb-1 text-xs font-bold text-slate-600">Length</span><input className="input input-bordered w-full bg-white" type="number" min="1" data-parameter="length" value={selectedDomain.length ?? ""} onChange={handleNumberChange} disabled={!canEdit || selectedDomain.system} /></label>}{selectedDomain.primitiveType === "decimal" && <div className="grid grid-cols-2 gap-3"><label className="flex flex-col"><span className="mb-1 text-xs font-bold text-slate-600">Precision</span><input className="input input-bordered w-full bg-white" type="number" min="1" data-parameter="precision" value={selectedDomain.precision ?? ""} onChange={handleNumberChange} disabled={!canEdit || selectedDomain.system} /></label><label className="flex flex-col"><span className="mb-1 text-xs font-bold text-slate-600">Scale</span><input className="input input-bordered w-full bg-white" type="number" min="0" data-parameter="scale" value={selectedDomain.scale ?? 0} onChange={handleNumberChange} disabled={!canEdit || selectedDomain.system} /></label></div>}{selectedDomain.primitiveType === "code_set" && <CodeSetEditor baseType={selectedDomain.codeSetBaseType ?? "varchar"} entries={selectedDomain.codeSetEntries ?? []} canEdit={canEdit && !selectedDomain.system} onChange={handleCodeSetChange} />}</div>}
              {!selectedDomain.system && <button type="button" className="btn btn-ghost gap-2 text-red-600" onClick={handleDelete} disabled={!canEdit}><Trash2 size={16} />Delete domain</button>}
            </div>}
          </section>
        </div>
      </div>
    </dialog>,
    document.body
  );
}
