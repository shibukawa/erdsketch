import type { ProjectSpec } from "./types.ts";

export const todoSpec = {
  id: "todo",
  title: "Todo",
  description: "Personal todo lists with labels and completion tracking.",
  level: "Simple",
  words: ["User", "Todo", "List", "Item", "Label", "Identifier", "Email", "Address", "Display", "Name", "Title", "Description", "Status", "Due", "Completed", "Position", "Sort", "Color", "Code", "Timestamp", "Created", "Updated", "At"],
  domains: [
    { name: "Identifier", primitiveType: "uuid" },
    { name: "Email Address", primitiveType: "varchar", length: 320 },
    { name: "Display Name", primitiveType: "varchar", length: 120 },
    { name: "Title", primitiveType: "varchar", length: 200 },
    { name: "Description", primitiveType: "text" },
    { name: "Todo Status", primitiveType: "code_set", length: 24, values: ["open", "in_progress", "completed", "cancelled"] },
    { name: "Timestamp", primitiveType: "datetime_with_timezone" },
    { name: "Sort Position", primitiveType: "integer" },
    { name: "Color Code", primitiveType: "varchar", length: 7 }
  ],
  models: [
    { id: "user", name: "User", description: "Person who owns lists and labels.", role: "master", privacy: true, volumeEstimate: { initialRecordCount: 50_000, growthRate: { amount: 120, period: "day" } }, fields: [
      { name: "User Identifier", domain: "Identifier", primaryKey: true, required: true },
      { name: "Email Address", domain: "Email Address", required: true, unique: true },
      { name: "Display Name", domain: "Display Name", required: true },
      { name: "Created At", domain: "Timestamp", required: true }
    ] },
    { id: "todo-list", name: "Todo List", description: "Named collection of todo items.", role: "master", volumeEstimate: { initialRecordCount: 160_000, growthRate: { amount: 500, period: "day" } }, fields: [
      { name: "Todo List Identifier", domain: "Identifier", primaryKey: true, required: true },
      { name: "User Identifier", domain: "Identifier", required: true },
      { name: "Title", domain: "Title", required: true },
      { name: "Description", domain: "Description", estimatedAverageSizeBytes: 500 },
      { name: "Created At", domain: "Timestamp", required: true }
    ] },
    { id: "todo-item", name: "Todo Item", description: "A unit of work with ordering and completion state.", role: "transaction", dependent: true, volumeEstimate: { initialRecordCount: 1_200_000, growthRate: { amount: 15_000, period: "day" }, retentionPeriod: { value: 3, unit: "year" } }, fields: [
      { name: "Todo Item Identifier", domain: "Identifier", primaryKey: true, required: true },
      { name: "Todo List Identifier", domain: "Identifier", required: true },
      { name: "Title", domain: "Title", required: true },
      { name: "Description", domain: "Description", estimatedAverageSizeBytes: 800 },
      { name: "Todo Status", domain: "Todo Status", required: true },
      { name: "Due At", domain: "Timestamp" },
      { name: "Completed At", domain: "Timestamp" },
      { name: "Sort Position", domain: "Sort Position", required: true },
      { name: "Created At", domain: "Timestamp", required: true },
      { name: "Updated At", domain: "Timestamp", required: true }
    ] },
    { id: "label", name: "Label", description: "Reusable user-owned classification label.", role: "master", volumeEstimate: { initialRecordCount: 250_000, growthRate: { amount: 700, period: "day" } }, fields: [
      { name: "Label Identifier", domain: "Identifier", primaryKey: true, required: true },
      { name: "User Identifier", domain: "Identifier", required: true },
      { name: "Name", domain: "Display Name", required: true },
      { name: "Color Code", domain: "Color Code", required: true }
    ] },
    { id: "todo-item-label", name: "Todo Item Label", description: "Many-to-many assignment of labels to todo items.", role: "transaction", dependent: true, volumeEstimate: { initialRecordCount: 2_400_000, growthRate: { amount: 25_000, period: "day" }, retentionPeriod: { value: 3, unit: "year" } }, fields: [
      { name: "Todo Item Identifier", domain: "Identifier", primaryKey: true, required: true },
      { name: "Label Identifier", domain: "Identifier", primaryKey: true, required: true },
      { name: "Created At", domain: "Timestamp", required: true }
    ] }
  ],
  relationships: [
    { id: "user-lists", name: "owns", sourceId: "user", targetId: "todo-list", sourceMultiplicity: "1", targetMultiplicity: "0..*" },
    { id: "list-items", name: "contains", sourceId: "todo-list", targetId: "todo-item", sourceMultiplicity: "1", targetMultiplicity: "0..*", kind: "composition" },
    { id: "user-labels", name: "defines", sourceId: "user", targetId: "label", sourceMultiplicity: "1", targetMultiplicity: "0..*" },
    { id: "item-label-links", name: "has labels", sourceId: "todo-item", targetId: "todo-item-label", sourceMultiplicity: "1", targetMultiplicity: "0..*", kind: "composition" },
    { id: "label-item-links", name: "labels", sourceId: "label", targetId: "todo-item-label", sourceMultiplicity: "1", targetMultiplicity: "0..*" }
  ],
  dfd: {
    name: "Manage todos",
    nodes: [
      { id: "todo-user", kind: "external", name: "Todo user", x: 100, y: 280 },
      { id: "manage-lists", kind: "process", name: "Manage lists", processKind: "ui", x: 440, y: 80 },
      { id: "list-store", kind: "model", name: "Todo List", modelId: "todo-list", x: 800, y: 80 },
      { id: "daily-screen", kind: "process", name: "Daily screen", processKind: "ui", x: 440, y: 280 },
      { id: "label-store", kind: "model", name: "Label", modelId: "label", x: 800, y: 274 },
      { id: "item-store", kind: "model", name: "Todo Item", modelId: "todo-item", x: 800, y: 414 },
      { id: "manage-items", kind: "process", name: "Manage items", processKind: "ui", x: 440, y: 500 }
    ],
    flows: [
      { id: "todo-open", sourceId: "todo-user", destinationId: "manage-lists", label: "list request" },
      { id: "todo-list-data", sourceId: "manage-lists", destinationId: "list-store", label: "list data", crudAssignments: [{ processUnitId: "todo-definition-manage-lists", modelId: "todo-list", operations: ["C"] }] },
      { id: "todo-daily", sourceId: "todo-user", destinationId: "daily-screen", label: "item changes" },
      { id: "todo-label-data", sourceId: "daily-screen", destinationId: "label-store", label: "label assignment", crudAssignments: [{ processUnitId: "todo-definition-daily-screen", modelId: "label", operations: ["C"] }] },
      { id: "todo-daily-item-data", sourceId: "daily-screen", destinationId: "item-store", label: "todo item", crudAssignments: [{ processUnitId: "todo-definition-daily-screen", modelId: "todo-item", operations: ["U"] }] },
      { id: "todo-edit", sourceId: "todo-user", destinationId: "manage-items", label: "item changes" },
      { id: "todo-item-data", sourceId: "manage-items", destinationId: "item-store", label: "todo item", crudAssignments: [{ processUnitId: "todo-definition-manage-items", modelId: "todo-item", operations: ["C"] }] }
    ]
  }
} satisfies ProjectSpec<"todo">;
