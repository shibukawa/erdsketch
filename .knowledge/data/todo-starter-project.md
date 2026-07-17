---
id: data:todo-starter-project
type: data
title: Todo Starter Project
---

Todo starter is the smallest complete data:starter-project-template and demonstrates ownership, ordered work, status, labels, and a many-to-many association.

```yaml
metadata:
  template_id: todo
  title: Todo
  summary: Personal todo lists with labels and completion tracking.
  level: simple
domains:
  - {name: Identifier, type: uuid, generation: uuid}
  - {name: EmailAddress, type: varchar, length: 320}
  - {name: DisplayName, type: varchar, length: 120}
  - {name: Title, type: varchar, length: 200}
  - {name: Description, type: text}
  - {name: TodoStatus, type: varchar, length: 24, values: [open, in_progress, completed, cancelled]}
  - {name: Timestamp, type: timestamptz}
  - {name: SortPosition, type: integer}
  - {name: ColorCode, type: char, length: 7}
vocabulary:
  - {business: User, system: User, physical: user}
  - {business: Todo, system: Todo, physical: todo}
  - {business: List, system: List, physical: list}
  - {business: Item, system: Item, physical: item}
  - {business: Label, system: Label, physical: label}
  - {business: Identifier, system: Id, physical: id}
  - {business: Email, system: Email, physical: email}
  - {business: Address, system: Address, physical: address}
  - {business: Display, system: Display, physical: display}
  - {business: Name, system: Name, physical: name}
  - {business: Title, system: Title, physical: title}
  - {business: Description, system: Description, physical: description}
  - {business: Status, system: Status, physical: status}
  - {business: Due, system: Due, physical: due}
  - {business: Completed, system: Completed, physical: completed}
  - {business: Position, system: Position, physical: position}
  - {business: Sort, system: Sort, physical: sort}
  - {business: Color, system: Color, physical: color}
  - {business: Code, system: Code, physical: code}
  - {business: Timestamp, system: Timestamp, physical: timestamp}
  - {business: Created, system: Created, physical: created}
  - {business: Updated, system: Updated, physical: updated}
  - {business: At, system: At, physical: at}
models:
  - id: user
    fields:
      - {name: user_identifier, domain: Identifier, primary_key: true}
      - {name: email_address, domain: EmailAddress, required: true, unique: true}
      - {name: display_name, domain: DisplayName, required: true}
      - {name: created_at, domain: Timestamp, required: true}
  - id: todo_list
    fields:
      - {name: todo_list_identifier, domain: Identifier, primary_key: true}
      - {name: user_identifier, domain: Identifier, required: true}
      - {name: title, domain: Title, required: true}
      - {name: description, domain: Description}
      - {name: created_at, domain: Timestamp, required: true}
  - id: todo_item
    fields:
      - {name: todo_item_identifier, domain: Identifier, primary_key: true}
      - {name: todo_list_identifier, domain: Identifier, required: true}
      - {name: title, domain: Title, required: true}
      - {name: description, domain: Description}
      - {name: todo_status, domain: TodoStatus, required: true}
      - {name: due_at, domain: Timestamp}
      - {name: completed_at, domain: Timestamp}
      - {name: sort_position, domain: SortPosition, required: true}
      - {name: created_at, domain: Timestamp, required: true}
      - {name: updated_at, domain: Timestamp, required: true}
  - id: label
    fields:
      - {name: label_identifier, domain: Identifier, primary_key: true}
      - {name: user_identifier, domain: Identifier, required: true}
      - {name: name, domain: DisplayName, required: true}
      - {name: color_code, domain: ColorCode, required: true}
  - id: todo_item_label
    fields:
      - {name: todo_item_identifier, domain: Identifier, primary_key: true}
      - {name: label_identifier, domain: Identifier, primary_key: true}
      - {name: created_at, domain: Timestamp, required: true}
relationships:
  - {from: user, to: todo_list, multiplicity: one_to_many}
  - {from: todo_list, to: todo_item, multiplicity: one_to_many, composition: true}
  - {from: user, to: label, multiplicity: one_to_many}
  - {from: todo_item, through: todo_item_label, to: label, multiplicity: many_to_many}
canvases:
  erd: [{id: todo_data_model, models: [user, todo_list, todo_item, label, todo_item_label]}]
  dfd:
    - id: manage_todos
      processes: [manage_lists, manage_items, manage_labels]
      stores: [todo_list, todo_item, label]
      actors: [todo_user]
coverage:
  vocabulary_unmatched_segments: 0
  undefined_assigned_domains: 0
```
