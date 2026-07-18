import type { ProjectSpec } from "./types.ts";

export const blogSpec = {
  id: "blog",
  title: "Blog",
  description: "Multi-author publishing with categories and moderated comments.",
  level: "Intermediate",
  words: ["User", "Blog", "Post", "Category", "Comment", "Owner", "Author", "Identifier", "Email", "Address", "Display", "Name", "Slug", "Title", "Body", "Content", "Status", "Published", "Timestamp", "Created", "Updated", "At"],
  domains: [
    { name: "Identifier", primitiveType: "uuid" },
    { name: "Email Address", primitiveType: "varchar", length: 320 },
    { name: "Display Name", primitiveType: "varchar", length: 120 },
    { name: "Slug", primitiveType: "varchar", length: 200 },
    { name: "Title", primitiveType: "varchar", length: 200 },
    { name: "Content", primitiveType: "text" },
    { name: "Post Status", primitiveType: "code_set", length: 24, values: ["draft", "published", "archived"] },
    { name: "Comment Status", primitiveType: "code_set", length: 24, values: ["pending", "visible", "rejected"] },
    { name: "Timestamp", primitiveType: "datetime_with_timezone" }
  ],
  models: [
    { id: "user", name: "User", description: "Publishing account and post author.", role: "master", privacy: true, volumeEstimate: { initialRecordCount: 10_000, growthRate: { amount: 60, period: "day" } }, fields: [
      { name: "User Identifier", domain: "Identifier", primaryKey: true, required: true }, { name: "Email Address", domain: "Email Address", required: true, unique: true }, { name: "Display Name", domain: "Display Name", required: true }, { name: "Created At", domain: "Timestamp", required: true }
    ] },
    { id: "blog", name: "Blog", description: "Publishing site owned by a user.", role: "master", volumeEstimate: { initialRecordCount: 2_000, growthRate: { amount: 10, period: "day" } }, fields: [
      { name: "Blog Identifier", domain: "Identifier", primaryKey: true, required: true }, { name: "Owner User Identifier", domain: "Identifier", required: true }, { name: "Title", domain: "Title", required: true }, { name: "Slug", domain: "Slug", required: true, unique: true }, { name: "Created At", domain: "Timestamp", required: true }
    ] },
    { id: "post", name: "Post", description: "Authored publication with draft and published states.", role: "transaction", volumeEstimate: { initialRecordCount: 250_000, growthRate: { amount: 800, period: "day" }, retentionPeriod: { value: 7, unit: "year" } }, fields: [
      { name: "Post Identifier", domain: "Identifier", primaryKey: true, required: true }, { name: "Blog Identifier", domain: "Identifier", required: true }, { name: "Author User Identifier", domain: "Identifier", required: true }, { name: "Title", domain: "Title", required: true }, { name: "Slug", domain: "Slug", required: true }, { name: "Body", domain: "Content", required: true, estimatedAverageSizeBytes: 4_000 }, { name: "Post Status", domain: "Post Status", required: true }, { name: "Published At", domain: "Timestamp" }, { name: "Created At", domain: "Timestamp", required: true }, { name: "Updated At", domain: "Timestamp", required: true }
    ] },
    { id: "category", name: "Category", description: "Reusable post category.", role: "master", volumeEstimate: { initialRecordCount: 500, growthRate: { amount: 10, period: "month" } }, fields: [
      { name: "Category Identifier", domain: "Identifier", primaryKey: true, required: true }, { name: "Name", domain: "Display Name", required: true }, { name: "Slug", domain: "Slug", required: true, unique: true }
    ] },
    { id: "post-category", name: "Post Category", description: "Many-to-many post category membership.", role: "transaction", dependent: true, volumeEstimate: { initialRecordCount: 600_000, growthRate: { amount: 1_800, period: "day" }, retentionPeriod: { value: 7, unit: "year" } }, fields: [
      { name: "Post Identifier", domain: "Identifier", primaryKey: true, required: true }, { name: "Category Identifier", domain: "Identifier", primaryKey: true, required: true }
    ] },
    { id: "comment", name: "Comment", description: "Reader response awaiting moderation.", role: "transaction", dependent: true, privacy: true, volumeEstimate: { initialRecordCount: 2_000_000, growthRate: { amount: 9_000, period: "day" }, retentionPeriod: { value: 3, unit: "year" } }, fields: [
      { name: "Comment Identifier", domain: "Identifier", primaryKey: true, required: true }, { name: "Post Identifier", domain: "Identifier", required: true }, { name: "Author Name", domain: "Display Name", required: true }, { name: "Author Email Address", domain: "Email Address", required: true }, { name: "Body", domain: "Content", required: true, estimatedAverageSizeBytes: 800 }, { name: "Comment Status", domain: "Comment Status", required: true }, { name: "Created At", domain: "Timestamp", required: true }
    ] }
  ],
  relationships: [
    { id: "user-blogs", name: "owns", sourceId: "user", targetId: "blog", sourceMultiplicity: "1", targetMultiplicity: "0..*" },
    { id: "blog-posts", name: "publishes", sourceId: "blog", targetId: "post", sourceMultiplicity: "1", targetMultiplicity: "0..*", kind: "composition" },
    { id: "user-posts", name: "authors", sourceId: "user", targetId: "post", sourceMultiplicity: "1", targetMultiplicity: "0..*" },
    { id: "post-category-links", name: "categorized by", sourceId: "post", targetId: "post-category", sourceMultiplicity: "1", targetMultiplicity: "0..*", kind: "composition" },
    { id: "category-post-links", name: "classifies", sourceId: "category", targetId: "post-category", sourceMultiplicity: "1", targetMultiplicity: "0..*" },
    { id: "post-comments", name: "receives", sourceId: "post", targetId: "comment", sourceMultiplicity: "1", targetMultiplicity: "0..*", kind: "composition" }
  ],
  dfd: {
    name: "Publish and comment",
    nodes: [
      { id: "reader", kind: "external", name: "Reader", x: 100, y: 82 },
      { id: "moderate-comment", kind: "process", name: "Moderate comment", processKind: "ui", x: 440, y: 80 },
      { id: "comment-store", kind: "model", name: "Comment", modelId: "comment", x: 800, y: 80 },
      { id: "author", kind: "external", name: "Author", x: 100, y: 360 },
      { id: "publish-post", kind: "process", name: "Publish post", processKind: "ui", x: 440, y: 260 },
      { id: "category-store", kind: "model", name: "Category", modelId: "category", x: 800, y: 254 },
      { id: "edit-post", kind: "process", name: "Edit post", processKind: "ui", x: 440, y: 460 },
      { id: "post-store", kind: "model", name: "Post", modelId: "post", x: 800, y: 454 }
    ],
    flows: [
      { id: "reader-comment", sourceId: "reader", destinationId: "moderate-comment", label: "comment" },
      { id: "moderated-comment", sourceId: "moderate-comment", destinationId: "comment-store", label: "moderated comment" },
      { id: "author-draft", sourceId: "author", destinationId: "publish-post", label: "draft" },
      { id: "post-category-data", sourceId: "publish-post", destinationId: "category-store", label: "categories" },
      { id: "published-post", sourceId: "publish-post", destinationId: "post-store", label: "post" },
      { id: "author-edit", sourceId: "author", destinationId: "edit-post" },
      { id: "edited-post", sourceId: "edit-post", destinationId: "post-store", crudAssignments: [{ processUnitId: "blog-definition-edit-post", modelId: "post", operations: ["U", "D"] }] }
    ]
  }
} satisfies ProjectSpec<"blog">;
