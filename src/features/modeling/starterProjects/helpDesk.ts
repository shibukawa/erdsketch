import type { ProjectSpec } from "./types.ts";

export const helpDeskSpec = {
  id: "help-desk",
  title: "Help Desk",
  description: "Support ticket intake, triage, assignment, conversation, and resolution.",
  level: "Advanced",
  words: ["Organization", "Requester", "Agent", "Ticket", "Message", "Assignment", "Tag", "Identifier", "Email", "Address", "Display", "Name", "Subject", "Description", "Status", "Priority", "Author", "Type", "Body", "Color", "Code", "Timestamp", "Created", "Updated", "Resolved", "Assigned", "Unassigned", "At"],
  domains: [
    { name: "Identifier", primitiveType: "uuid" }, { name: "Email Address", primitiveType: "varchar", length: 320 }, { name: "Display Name", primitiveType: "varchar", length: 120 }, { name: "Subject", primitiveType: "varchar", length: 240 }, { name: "Description", primitiveType: "text" }, { name: "Message Body", primitiveType: "text" },
    { name: "Ticket Status", primitiveType: "code_set", length: 24, values: ["new", "triaged", "assigned", "waiting", "resolved", "closed"] }, { name: "Priority Code", primitiveType: "code_set", length: 16, values: ["low", "normal", "high", "urgent"] }, { name: "Agent Status", primitiveType: "code_set", length: 16, values: ["active", "away", "inactive"] }, { name: "Author Type", primitiveType: "code_set", length: 16, values: ["requester", "agent"] }, { name: "Timestamp", primitiveType: "datetime_with_timezone" }, { name: "Color Code", primitiveType: "varchar", length: 7 }
  ],
  models: [
    { id: "organization", name: "Organization", description: "Customer organization receiving support.", role: "master", volumeEstimate: { initialRecordCount: 15_000, growthRate: { amount: 150, period: "month" } }, fields: [{ name: "Organization Identifier", domain: "Identifier", primaryKey: true, required: true }, { name: "Display Name", domain: "Display Name", required: true }, { name: "Created At", domain: "Timestamp", required: true }] },
    { id: "requester", name: "Requester", description: "Person who raises a support ticket.", role: "master", privacy: true, volumeEstimate: { initialRecordCount: 400_000, growthRate: { amount: 1_200, period: "day" } }, fields: [{ name: "Requester Identifier", domain: "Identifier", primaryKey: true, required: true }, { name: "Organization Identifier", domain: "Identifier", required: true }, { name: "Display Name", domain: "Display Name", required: true }, { name: "Email Address", domain: "Email Address", required: true }, { name: "Created At", domain: "Timestamp", required: true }] },
    { id: "agent", name: "Agent", description: "Support agent assigned to tickets.", role: "master", privacy: true, volumeEstimate: { initialRecordCount: 3_500, growthRate: { amount: 15, period: "month" } }, fields: [{ name: "Agent Identifier", domain: "Identifier", primaryKey: true, required: true }, { name: "Display Name", domain: "Display Name", required: true }, { name: "Email Address", domain: "Email Address", required: true, unique: true }, { name: "Agent Status", domain: "Agent Status", required: true }, { name: "Created At", domain: "Timestamp", required: true }] },
    { id: "ticket", name: "Ticket", description: "Support request moving through triage and resolution.", role: "transaction", volumeEstimate: { initialRecordCount: 3_000_000, growthRate: { amount: 12_000, period: "day" }, retentionPeriod: { value: 5, unit: "year" } }, fields: [{ name: "Ticket Identifier", domain: "Identifier", primaryKey: true, required: true }, { name: "Organization Identifier", domain: "Identifier", required: true }, { name: "Requester Identifier", domain: "Identifier", required: true }, { name: "Subject", domain: "Subject", required: true }, { name: "Description", domain: "Description", required: true, estimatedAverageSizeBytes: 1_200 }, { name: "Ticket Status", domain: "Ticket Status", required: true }, { name: "Priority Code", domain: "Priority Code", required: true }, { name: "Created At", domain: "Timestamp", required: true }, { name: "Updated At", domain: "Timestamp", required: true }, { name: "Resolved At", domain: "Timestamp" }] },
    { id: "ticket-message", name: "Ticket Message", description: "Message exchanged by requesters and agents.", role: "transaction", dependent: true, privacy: true, volumeEstimate: { initialRecordCount: 18_000_000, growthRate: { amount: 80_000, period: "day" }, retentionPeriod: { value: 3, unit: "year" } }, fields: [{ name: "Ticket Message Identifier", domain: "Identifier", primaryKey: true, required: true }, { name: "Ticket Identifier", domain: "Identifier", required: true }, { name: "Author Type", domain: "Author Type", required: true }, { name: "Author Identifier", domain: "Identifier", required: true }, { name: "Message Body", domain: "Message Body", required: true, estimatedAverageSizeBytes: 1_000 }, { name: "Created At", domain: "Timestamp", required: true }] },
    { id: "ticket-assignment", name: "Ticket Assignment", description: "Time-bounded assignment of an agent to a ticket.", role: "history", dependent: true, volumeEstimate: { initialRecordCount: 7_000_000, growthRate: { amount: 25_000, period: "day" } }, fields: [{ name: "Ticket Identifier", domain: "Identifier", primaryKey: true, required: true }, { name: "Agent Identifier", domain: "Identifier", primaryKey: true, required: true }, { name: "Assigned At", domain: "Timestamp", required: true }, { name: "Unassigned At", domain: "Timestamp" }] },
    { id: "tag", name: "Tag", description: "Reusable classification for support tickets.", role: "master", volumeEstimate: { initialRecordCount: 1_500, growthRate: { amount: 10, period: "month" } }, fields: [{ name: "Tag Identifier", domain: "Identifier", primaryKey: true, required: true }, { name: "Display Name", domain: "Display Name", required: true }, { name: "Color Code", domain: "Color Code", required: true }] },
    { id: "ticket-tag", name: "Ticket Tag", description: "Many-to-many ticket tag membership.", role: "transaction", dependent: true, volumeEstimate: { initialRecordCount: 6_000_000, growthRate: { amount: 30_000, period: "day" }, retentionPeriod: { value: 5, unit: "year" } }, fields: [{ name: "Ticket Identifier", domain: "Identifier", primaryKey: true, required: true }, { name: "Tag Identifier", domain: "Identifier", primaryKey: true, required: true }, { name: "Created At", domain: "Timestamp", required: true }] }
  ],
  relationships: [
    { id: "organization-requesters", name: "has requesters", sourceId: "organization", targetId: "requester", sourceMultiplicity: "1", targetMultiplicity: "0..*" }, { id: "organization-tickets", name: "owns tickets", sourceId: "organization", targetId: "ticket", sourceMultiplicity: "1", targetMultiplicity: "0..*" }, { id: "requester-tickets", name: "raises", sourceId: "requester", targetId: "ticket", sourceMultiplicity: "1", targetMultiplicity: "0..*" },
    { id: "ticket-messages", name: "contains messages", sourceId: "ticket", targetId: "ticket-message", sourceMultiplicity: "1", targetMultiplicity: "0..*", kind: "composition" }, { id: "ticket-assignments", name: "has assignments", sourceId: "ticket", targetId: "ticket-assignment", sourceMultiplicity: "1", targetMultiplicity: "0..*", kind: "composition" }, { id: "agent-assignments", name: "receives assignments", sourceId: "agent", targetId: "ticket-assignment", sourceMultiplicity: "1", targetMultiplicity: "0..*" }, { id: "ticket-tag-links", name: "has tags", sourceId: "ticket", targetId: "ticket-tag", sourceMultiplicity: "1", targetMultiplicity: "0..*", kind: "composition" }, { id: "tag-ticket-links", name: "classifies", sourceId: "tag", targetId: "ticket-tag", sourceMultiplicity: "1", targetMultiplicity: "0..*" }
  ],
  dfd: {
    name: "Ticket lifecycle",
    nodes: [
      { id: "requester-user", kind: "external", name: "Requester", x: 100, y: 116 },
      { id: "accept-ticket", kind: "process", name: "Accept ticket", processKind: "ui", x: 440, y: 120 },
      { id: "requester-store", kind: "model", name: "Requester", modelId: "requester", x: 800, y: 114 },
      { id: "ticket-store", kind: "model", name: "Ticket", modelId: "ticket", x: 800, y: 300 },
      { id: "support-agent", kind: "external", name: "Support agent", x: 100, y: 496 },
      { id: "resolve-ticket", kind: "process", name: "Exchange messages and resolve", processKind: "ui", x: 440, y: 500 },
      { id: "message-store", kind: "model", name: "Ticket Message", modelId: "ticket-message", x: 800, y: 494 },
      { id: "triage-ticket", kind: "process", name: "Triage and assign", processKind: "ui", x: 1160, y: 328 },
      { id: "agent-store", kind: "model", name: "Agent", modelId: "agent", x: 1520, y: 220 },
      { id: "assignment-store", kind: "model", name: "Ticket Assignment", modelId: "ticket-assignment", x: 1520, y: 400 }
    ],
    flows: [
      { id: "request-ticket", sourceId: "requester-user", destinationId: "accept-ticket", label: "support request" },
      { id: "requester-data", sourceId: "accept-ticket", destinationId: "requester-store", label: "requester" },
      { id: "ticket-data", sourceId: "accept-ticket", destinationId: "ticket-store", label: "new ticket" },
      { id: "agent-response", sourceId: "support-agent", destinationId: "resolve-ticket", label: "response" },
      { id: "message-data", sourceId: "resolve-ticket", destinationId: "message-store", label: "message" },
      { id: "resolved-ticket", sourceId: "resolve-ticket", destinationId: "ticket-store", label: "ticket status", crudAssignments: [{ processUnitId: "help-desk-definition-resolve-ticket", modelId: "ticket", operations: ["U"] }] },
      { id: "ticket-triage", sourceId: "ticket-store", destinationId: "triage-ticket", label: "untriaged ticket" },
      { id: "agent-data", sourceId: "triage-ticket", destinationId: "agent-store", label: "agent availability" },
      { id: "assignment-data", sourceId: "triage-ticket", destinationId: "assignment-store", label: "assignment" }
    ]
  }
} satisfies ProjectSpec<"help-desk">;
