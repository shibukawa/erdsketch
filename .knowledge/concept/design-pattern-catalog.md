---
id: concept:design-pattern-catalog
type: concept
title: Design Pattern Catalog
---

The pattern catalog is the central knowledge base for reusable modeling improvements.

```yaml
principle: Design patterns are more important than transformations.
pattern_structure: data:design-pattern
taxonomies:
  entity_modeling:
    - Entity Extraction
    - Entity Merge
    - Entity Split
    - Entity Inheritance
    - Role Pattern
    - Value Object Extraction
  relationship_modeling:
    - 1:N
    - N:M
    - Associative Entity
    - Child Entity
    - Dependent Entity
    - Composition
    - Aggregation
    - Recursive Relationship
  attribute_modeling:
    - Composite Attribute
    - Multi-value Attribute
    - Enum
    - Lookup Table
    - Calculated Attribute
  identity_strategy:
    - Natural Key
    - Surrogate Key
    - Auto Increment
    - UUID v4
    - UUID v7
    - ULID
    - KSUID
    - Snowflake
    - Composite Key
    - Business Key
    - External ID
  normalization:
    - 1NF
    - 2NF
    - 3NF
    - BCNF
    - Denormalization
    - Summary Table
    - Materialized View
  lifecycle:
    - History Table
    - Snapshot
    - Business Snapshot
    - Transaction Snapshot
    - Archive
    - Retention
    - Purge
    - Work Table
  performance:
    - Index
    - Composite Index
    - Covering Index
    - Partition
    - Cache
    - CQRS
    - Read Replica
  storage:
    - OLTP
    - OLAP
    - Data Lake
    - Search
    - Cache
    - Object Storage
    - Vector Database
  governance:
    - Owner
    - Steward
    - Data Quality
    - Data Contract
    - Lineage
    - Classification
  security:
    - PII
    - Encryption
    - Masking
    - Audit
    - Access Control
  integration:
    - CDC
    - ETL
    - ELT
    - Event Sourcing
    - Outbox Pattern
  system_boundary:
    - Single Schema
    - Schema per Subsystem
    - Database per System
    - Shared Database
    - Service-owned Database
  reference:
    - Foreign Key Reference
    - Reference API
    - Local Replica
    - Event-synchronized Copy
    - CDC Replica
    - Transaction Snapshot
    - Periodic Snapshot
    - Manual Import
    - Denormalized Copy
  correction:
    - In-place Correction
    - Red-Black Correction
    - Reversal
    - Adjustment Entry
    - Versioned Correction
    - Status-based Correction
  reconciliation:
    - One-to-One
    - One-to-Many
    - Many-to-One
    - Many-to-Many
    - Partial Matching
    - Tolerance Matching
    - Suspense
related:
  - data:design-pattern
  - concept:intent-based-navigation
  - concept:assistive-ai-experience
  - concept:pattern-heuristic
```
