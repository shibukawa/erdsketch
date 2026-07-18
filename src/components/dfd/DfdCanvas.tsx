import { Link2 } from "lucide-react";
import type { PointerEvent, PointerEventHandler, RefObject } from "react";
import type { CardDisplayMode, DfdFlow, DfdGroup, DfdNode, ModelSeed, Viewport } from "../../features/modeling/types";
import { DFD_CANVAS_SIZE, endpointBounds, groupBounds } from "../../features/dfd/dfd";
import { DfdFlowLayer } from "./DfdFlowLayer";
import { DfdNodeCard } from "./DfdNodeCard";
import { DfdRoughGroup } from "./DfdRoughGroup";
import type { Collaborator } from "../../collaboration";
import type { AnnotationAnchor, CanvasPoint } from "../../features/annotations/types";
import type { CanvasAnnotationController } from "../../features/annotations/useCanvasAnnotations";
import { CanvasAnnotationLayer } from "../annotations/CanvasAnnotationLayer";
import { AnnotationToolbar } from "../annotations/AnnotationToolbar";
import { RemoteCursor } from "../diagram/RemoteCursor";
import { CanvasTips } from "../diagram/CanvasTips";
import { CanvasDisplayControls } from "../diagram/CanvasDisplayControls";
import { CanvasAiChatButton } from "../ai/CanvasAiChatButton";

type DfdCanvasProps = {
  canvasRef: RefObject<HTMLDivElement | null>;
  nodes: DfdNode[];
  groups: DfdGroup[];
  flows: DfdFlow[];
  models: ModelSeed[];
  viewport: Viewport;
  canvasId: string;
  canvasTitle: string;
  selectedEndpointId?: string;
  selectedFlowId?: string;
  connectionSourceId?: string;
  connectionDrag?: { sourceId: string; x: number; y: number };
  connectionDropTargetId?: string;
  tip: string;
  displayMode: CardDisplayMode;
  onDisplayModeChange: (mode: CardDisplayMode) => void;
  onCanvasPointerDown: PointerEventHandler<HTMLDivElement>;
  onCanvasPointerMove: PointerEventHandler<HTMLDivElement>;
  onCanvasPointerUp: PointerEventHandler<HTMLDivElement>;
  onNodePointerDown: Parameters<typeof DfdNodeCard>[0]["onPointerDown"];
  onLinkPointerDown: Parameters<typeof DfdNodeCard>[0]["onLinkPointerDown"];
  onGroupLinkPointerDown: (event: PointerEvent<HTMLElement>, group: DfdGroup) => void;
  onEditModelFields: Parameters<typeof DfdNodeCard>[0]["onEditModelFields"];
  onUpdateNode: Parameters<typeof DfdNodeCard>[0]["onUpdateNode"];
  onUpdateModel: Parameters<typeof DfdNodeCard>[0]["onUpdateModel"];
  onSelectEndpoint: (id: string) => void;
  onSelectFlow: (id: string) => void;
  annotationController: CanvasAnnotationController;
  annotationUsers: Collaborator[];
  me: Collaborator;
  remoteUsers: Collaborator[];
  resolveAnnotationAnchor: (anchor: AnnotationAnchor) => CanvasPoint;
  onResetView: () => void;
  onUpdateScale: (scale: number) => void;
};

export function DfdCanvas({ canvasRef, nodes, groups, flows, models, viewport, canvasId, canvasTitle, selectedEndpointId, selectedFlowId, connectionSourceId, connectionDrag, connectionDropTargetId, tip, displayMode, onDisplayModeChange, onCanvasPointerDown, onCanvasPointerMove, onCanvasPointerUp, onNodePointerDown, onLinkPointerDown, onGroupLinkPointerDown, onEditModelFields, onUpdateNode, onUpdateModel, onSelectEndpoint, onSelectFlow, annotationController, annotationUsers, me, remoteUsers, resolveAnnotationAnchor, onResetView, onUpdateScale }: DfdCanvasProps) {
  return <div data-tour="dfd-canvas" ref={canvasRef} className="erd-canvas relative min-h-0 flex-1 overflow-hidden cursor-grab" style={{ backgroundPosition: `${viewport.x}px ${viewport.y}px, ${viewport.x}px ${viewport.y}px, ${viewport.x}px ${viewport.y}px`, backgroundSize: `${24 * viewport.scale}px ${24 * viewport.scale}px, ${120 * viewport.scale}px ${120 * viewport.scale}px, ${120 * viewport.scale}px ${120 * viewport.scale}px` }} onPointerDown={onCanvasPointerDown} onPointerMove={onCanvasPointerMove} onPointerUp={onCanvasPointerUp} onPointerCancel={onCanvasPointerUp}>
    <div className="absolute left-0 top-0 origin-top-left" style={{ width: DFD_CANVAS_SIZE.width, height: DFD_CANVAS_SIZE.height, transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})` }}>
      <CanvasAnnotationLayer layer="background" controller={annotationController} users={annotationUsers} me={me} resolveAnchor={resolveAnnotationAnchor} width={DFD_CANVAS_SIZE.width} height={DFD_CANVAS_SIZE.height} />
      {groups.map((group) => {
        const bounds = groupBounds(group, nodes);
        return <div key={group.id} data-dfd-group={group.id} role="button" tabIndex={0} className="absolute bg-white/20" style={{ left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height }} onClick={() => onSelectEndpoint(group.id)}><DfdRoughGroup width={bounds.width} height={bounds.height} selected={selectedEndpointId === group.id || connectionDropTargetId === group.id} /><span className="absolute -top-3 left-4 rounded bg-white px-2 text-[10px] font-bold uppercase tracking-wide text-slate-600">{group.kind.replace("_", " ")} group</span>{selectedEndpointId === group.id && <span role="button" tabIndex={0} className="absolute -bottom-2 -right-2 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-blue-200 bg-white text-blue-700 shadow-md" aria-label={`Create data flow from ${group.kind} group`} onPointerDown={(event) => onGroupLinkPointerDown(event, group)}><Link2 size={16} /></span>}</div>;
      })}
      <DfdFlowLayer flows={flows} nodes={nodes} groups={groups} selectedFlowId={selectedFlowId} onSelect={onSelectFlow} />
      {connectionDrag && (() => { const source = endpointBounds(connectionDrag.sourceId, nodes, groups); if (!source) return null; return <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"><path d={`M ${source.x + source.width} ${source.y + source.height} L ${connectionDrag.x} ${connectionDrag.y}`} fill="none" stroke="#2563eb" strokeWidth="2" strokeDasharray="6 5" /></svg>; })()}
      {nodes.map((node) => <DfdNodeCard key={node.id} node={node} model={models.find((model) => model.id === node.modelId)} selected={selectedEndpointId === node.id} connectionSource={connectionSourceId === node.id} relationshipDropTarget={connectionDropTargetId === node.id} displayMode={displayMode} onSelect={onSelectEndpoint} onPointerDown={onNodePointerDown} onLinkPointerDown={onLinkPointerDown} onEditModelFields={onEditModelFields} onUpdateNode={onUpdateNode} onUpdateModel={onUpdateModel} />)}
      <CanvasAnnotationLayer layer="foreground" controller={annotationController} users={annotationUsers} me={me} resolveAnchor={resolveAnnotationAnchor} width={DFD_CANVAS_SIZE.width} height={DFD_CANVAS_SIZE.height} />
      {remoteUsers.map((user) => <RemoteCursor key={user.id} user={user} />)}
    </div>
    <AnnotationToolbar controller={annotationController} />
    <CanvasAiChatButton surface={{ kind: "dfd-canvas", id: canvasId, title: canvasTitle, selectedModelIds: selectedEndpointId ? nodes.filter((node) => node.id === selectedEndpointId && node.modelId).map((node) => node.modelId!) : [], selectedProcessOrFlowIds: [selectedEndpointId, selectedFlowId].filter((id): id is string => Boolean(id)) }} />
    <CanvasDisplayControls displayMode={displayMode} contentLabel="Card content" onDisplayModeChange={onDisplayModeChange} />
    <CanvasTips scale={viewport.scale} onResetView={onResetView} onUpdateScale={onUpdateScale} dailyTip={tip} />
  </div>;
}
