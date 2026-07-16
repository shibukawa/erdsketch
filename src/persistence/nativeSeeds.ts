import { wailsApp } from "./wailsBridge";

type NativeSeedDocument = { path: string; text: string };

export type NativeSeedOverride = {
  id: string;
  title?: string;
  description?: string;
  x?: number;
  y?: number;
  maturedLevel?: number;
  role?: string;
  dependency?: string;
  hasPrivacy?: boolean;
};

function scalar(text: string, key: string) {
  return text.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1].trim();
}

function position(text: string, key: "x" | "y") {
  return text.match(new RegExp(`^position:\\s*\\n(?:[ \\t]+.*\\n)*?[ \\t]+${key}:\\s*(-?\\d+(?:\\.\\d+)?)`, "m"))?.[1];
}

function parseDocument(document: NativeSeedDocument): NativeSeedOverride | undefined {
  const rawID = scalar(document.text, "id");
  if (!rawID?.startsWith("seed:")) return undefined;
  const number = (value?: string) => value === undefined ? undefined : Number(value);
  const boolean = (value?: string) => value === undefined ? undefined : value === "true";
  return {
    id: rawID.slice("seed:".length),
    title: scalar(document.text, "title"),
    description: scalar(document.text, "note"),
    x: number(position(document.text, "x")),
    y: number(position(document.text, "y")),
    maturedLevel: number(scalar(document.text, "matured_level")),
    role: scalar(document.text, "role"),
    dependency: scalar(document.text, "dependency"),
    hasPrivacy: boolean(scalar(document.text, "privacy"))
  };
}

export async function loadNativeSeedOverrides() {
  const desktop = wailsApp();
  let documents: NativeSeedDocument[];
  if (desktop) {
    documents = await desktop.ListSeeds();
  } else {
    const response = await fetch("/api/seeds");
    if (!response.ok) throw new Error(await response.text());
    documents = await response.json() as NativeSeedDocument[];
  }
  return documents.map(parseDocument).filter((seed): seed is NativeSeedOverride => seed !== undefined);
}
