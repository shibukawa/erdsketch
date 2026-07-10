export type EntityRole = "master" | "transaction" | "summary" | "history" | "work";

export type Dependency = "independent" | "dependent";

export type ModelField = {
  id: string;
  name: string;
  primaryKey: boolean;
  important: boolean;
};

export type CardDisplayMode = "description" | "key-fields";

export type ModelSeed = {
  id: string;
  title: string;
  description: string;
  fields: ModelField[];
  x: number;
  y: number;
  role: EntityRole;
  dependency: Dependency;
  hasPrivacy: boolean;
  maturedLevel: number;
  rotation: number;
};

export type Viewport = {
  x: number;
  y: number;
  scale: number;
};

export type DragState =
  | {
      type: "pan";
      pointerId: number;
      startX: number;
      startY: number;
      origin: Viewport;
    }
  | {
      type: "seed";
      pointerId: number;
      seedId: string;
      offsetX: number;
      offsetY: number;
    }
  | null;
