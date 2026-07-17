---
id: data:blog-starter-project
type: data
title: Blog Starter Project
---

Blog starter is a medium data:starter-project-template demonstrating authorship, publication lifecycle, categorization, comments, uniqueness, and slugs.

```yaml
metadata:
  template_id: blog
  title: Blog
  summary: Multi-author publishing with categories and moderated comments.
  level: intermediate
domains:
  - {name: Identifier, type: uuid, generation: uuid}
  - {name: EmailAddress, type: varchar, length: 320}
  - {name: DisplayName, type: varchar, length: 120}
  - {name: Slug, type: varchar, length: 200}
  - {name: Title, type: varchar, length: 200}
  - {name: Content, type: text}
  - {name: PostStatus, type: varchar, length: 24, values: [draft, published, archived]}
  - {name: CommentStatus, type: varchar, length: 24, values: [pending, visible, rejected]}
  - {name: Timestamp, type: timestamptz}
vocabulary:
  - {business: User, system: User, physical: user}
  - {business: Blog, system: Blog, physical: blog}
  - {business: Post, system: Post, physical: post}
  - {business: Category, system: Category, physical: category}
  - {business: Comment, system: Comment, physical: comment}
  - {business: Owner, system: Owner, physical: owner}
  - {business: Author, system: Author, physical: author}
  - {business: Identifier, system: Id, physical: id}
  - {business: Email, system: Email, physical: email}
  - {business: Address, system: Address, physical: address}
  - {business: Display, system: Display, physical: display}
  - {business: Name, system: Name, physical: name}
  - {business: Slug, system: Slug, physical: slug}
  - {business: Title, system: Title, physical: title}
  - {business: Body, system: Body, physical: body}
  - {business: Content, system: Content, physical: content}
  - {business: Status, system: Status, physical: status}
  - {business: Published, system: Published, physical: published}
  - {business: Created, system: Created, physical: created}
  - {business: Updated, system: Updated, physical: updated}
  - {business: At, system: At, physical: at}
  - {business: Timestamp, system: Timestamp, physical: timestamp}
models:
  - id: user
    fields:
      - {name: user_identifier, domain: Identifier, primary_key: true}
      - {name: email_address, domain: EmailAddress, required: true, unique: true}
      - {name: display_name, domain: DisplayName, required: true}
      - {name: created_at, domain: Timestamp, required: true}
  - id: blog
    fields:
      - {name: blog_identifier, domain: Identifier, primary_key: true}
      - {name: owner_user_identifier, domain: Identifier, required: true}
      - {name: title, domain: Title, required: true}
      - {name: slug, domain: Slug, required: true, unique: true}
      - {name: created_at, domain: Timestamp, required: true}
  - id: post
    fields:
      - {name: post_identifier, domain: Identifier, primary_key: true}
      - {name: blog_identifier, domain: Identifier, required: true}
      - {name: author_user_identifier, domain: Identifier, required: true}
      - {name: title, domain: Title, required: true}
      - {name: slug, domain: Slug, required: true}
      - {name: body, domain: Content, required: true}
      - {name: post_status, domain: PostStatus, required: true}
      - {name: published_at, domain: Timestamp}
      - {name: created_at, domain: Timestamp, required: true}
      - {name: updated_at, domain: Timestamp, required: true}
  - id: category
    fields:
      - {name: category_identifier, domain: Identifier, primary_key: true}
      - {name: name, domain: DisplayName, required: true}
      - {name: slug, domain: Slug, required: true, unique: true}
  - id: post_category
    fields:
      - {name: post_identifier, domain: Identifier, primary_key: true}
      - {name: category_identifier, domain: Identifier, primary_key: true}
  - id: comment
    fields:
      - {name: comment_identifier, domain: Identifier, primary_key: true}
      - {name: post_identifier, domain: Identifier, required: true}
      - {name: author_name, domain: DisplayName, required: true}
      - {name: author_email_address, domain: EmailAddress, required: true}
      - {name: body, domain: Content, required: true}
      - {name: comment_status, domain: CommentStatus, required: true}
      - {name: created_at, domain: Timestamp, required: true}
relationships:
  - {from: user, to: blog, multiplicity: one_to_many, role: owner}
  - {from: blog, to: post, multiplicity: one_to_many, composition: true}
  - {from: user, to: post, multiplicity: one_to_many, role: author}
  - {from: post, through: post_category, to: category, multiplicity: many_to_many}
  - {from: post, to: comment, multiplicity: one_to_many, composition: true}
canvases:
  erd: [{id: publishing_data_model, models: [user, blog, post, category, post_category, comment]}]
  dfd:
    - id: publish_and_comment
      processes: [draft_post, publish_post, submit_comment, moderate_comment]
      stores: [post, category, comment]
      actors: [author, reader, moderator]
coverage:
  vocabulary_unmatched_segments: 0
  undefined_assigned_domains: 0
```
