---
id: data:help-desk-starter-project
type: data
title: Help Desk Starter Project
---

Help desk starter is an advanced data:starter-project-template demonstrating organizations, requesters, agents, ticket lifecycle, messages, assignments, and tagging.

```yaml
metadata:
  template_id: help_desk
  title: Help Desk
  summary: Support ticket intake, triage, assignment, conversation, and resolution.
  level: advanced
domains:
  - {name: Identifier, type: uuid, generation: uuid}
  - {name: EmailAddress, type: varchar, length: 320}
  - {name: DisplayName, type: varchar, length: 120}
  - {name: Subject, type: varchar, length: 240}
  - {name: Description, type: text}
  - {name: MessageBody, type: text}
  - {name: TicketStatus, type: varchar, length: 24, values: [new, triaged, assigned, waiting, resolved, closed]}
  - {name: PriorityCode, type: varchar, length: 16, values: [low, normal, high, urgent]}
  - {name: AgentStatus, type: varchar, length: 16, values: [active, away, inactive]}
  - {name: AuthorType, type: varchar, length: 16, values: [requester, agent]}
  - {name: Timestamp, type: timestamptz}
  - {name: ColorCode, type: char, length: 7}
vocabulary:
  - {business: Organization, system: Organization, physical: organization}
  - {business: Requester, system: Requester, physical: requester}
  - {business: Agent, system: Agent, physical: agent}
  - {business: Ticket, system: Ticket, physical: ticket}
  - {business: Message, system: Message, physical: message}
  - {business: Assignment, system: Assignment, physical: assignment}
  - {business: Tag, system: Tag, physical: tag}
  - {business: Identifier, system: Id, physical: id}
  - {business: Email, system: Email, physical: email}
  - {business: Address, system: Address, physical: address}
  - {business: Display, system: Display, physical: display}
  - {business: Name, system: Name, physical: name}
  - {business: Subject, system: Subject, physical: subject}
  - {business: Description, system: Description, physical: description}
  - {business: Status, system: Status, physical: status}
  - {business: Priority, system: Priority, physical: priority}
  - {business: Author, system: Author, physical: author}
  - {business: Type, system: Type, physical: type}
  - {business: Body, system: Body, physical: body}
  - {business: Color, system: Color, physical: color}
  - {business: Code, system: Code, physical: code}
  - {business: Timestamp, system: Timestamp, physical: timestamp}
  - {business: Created, system: Created, physical: created}
  - {business: Updated, system: Updated, physical: updated}
  - {business: Resolved, system: Resolved, physical: resolved}
  - {business: Assigned, system: Assigned, physical: assigned}
  - {business: Unassigned, system: Unassigned, physical: unassigned}
  - {business: At, system: At, physical: at}
models:
  - id: organization
    fields:
      - {name: organization_identifier, domain: Identifier, primary_key: true}
      - {name: display_name, domain: DisplayName, required: true}
      - {name: created_at, domain: Timestamp, required: true}
  - id: requester
    fields:
      - {name: requester_identifier, domain: Identifier, primary_key: true}
      - {name: organization_identifier, domain: Identifier, required: true}
      - {name: display_name, domain: DisplayName, required: true}
      - {name: email_address, domain: EmailAddress, required: true}
      - {name: created_at, domain: Timestamp, required: true}
  - id: agent
    fields:
      - {name: agent_identifier, domain: Identifier, primary_key: true}
      - {name: display_name, domain: DisplayName, required: true}
      - {name: email_address, domain: EmailAddress, required: true, unique: true}
      - {name: agent_status, domain: AgentStatus, required: true}
      - {name: created_at, domain: Timestamp, required: true}
  - id: ticket
    fields:
      - {name: ticket_identifier, domain: Identifier, primary_key: true}
      - {name: organization_identifier, domain: Identifier, required: true}
      - {name: requester_identifier, domain: Identifier, required: true}
      - {name: subject, domain: Subject, required: true}
      - {name: description, domain: Description, required: true}
      - {name: ticket_status, domain: TicketStatus, required: true}
      - {name: priority_code, domain: PriorityCode, required: true}
      - {name: created_at, domain: Timestamp, required: true}
      - {name: updated_at, domain: Timestamp, required: true}
      - {name: resolved_at, domain: Timestamp}
  - id: ticket_message
    fields:
      - {name: ticket_message_identifier, domain: Identifier, primary_key: true}
      - {name: ticket_identifier, domain: Identifier, required: true}
      - {name: author_type, domain: AuthorType, required: true}
      - {name: author_identifier, domain: Identifier, required: true}
      - {name: message_body, domain: MessageBody, required: true}
      - {name: created_at, domain: Timestamp, required: true}
  - id: ticket_assignment
    fields:
      - {name: ticket_identifier, domain: Identifier, primary_key: true}
      - {name: agent_identifier, domain: Identifier, primary_key: true}
      - {name: assigned_at, domain: Timestamp, required: true}
      - {name: unassigned_at, domain: Timestamp}
  - id: tag
    fields:
      - {name: tag_identifier, domain: Identifier, primary_key: true}
      - {name: display_name, domain: DisplayName, required: true}
      - {name: color_code, domain: ColorCode, required: true}
  - id: ticket_tag
    fields:
      - {name: ticket_identifier, domain: Identifier, primary_key: true}
      - {name: tag_identifier, domain: Identifier, primary_key: true}
      - {name: created_at, domain: Timestamp, required: true}
relationships:
  - {from: organization, to: requester, multiplicity: one_to_many}
  - {from: organization, to: ticket, multiplicity: one_to_many}
  - {from: requester, to: ticket, multiplicity: one_to_many}
  - {from: ticket, to: ticket_message, multiplicity: one_to_many, composition: true}
  - {from: ticket, through: ticket_assignment, to: agent, multiplicity: many_to_many}
  - {from: ticket, through: ticket_tag, to: tag, multiplicity: many_to_many}
canvases:
  erd: [{id: help_desk_data_model, models: [organization, requester, agent, ticket, ticket_message, ticket_assignment, tag, ticket_tag]}]
  dfd:
    - id: ticket_lifecycle
      processes: [accept_ticket, triage_ticket, assign_agent, exchange_messages, resolve_ticket]
      stores: [requester, agent, ticket, ticket_message, ticket_assignment, tag]
      actors: [requester_user, support_agent]
coverage:
  vocabulary_unmatched_segments: 0
  undefined_assigned_domains: 0
```
