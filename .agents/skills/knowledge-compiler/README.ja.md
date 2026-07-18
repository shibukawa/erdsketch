# Knowledge Compiler

Knowledge Compiler は、AI ファーストな `.knowledge` カタログを管理するための Codex スキルです。長い人間向け仕様書ではなく、小さな machine-first concept の集合として仕様知識を扱います。

## 思想

`.knowledge` の source は AI エージェント向けに最適化します。

- source language は token-efficient English にする。
- 1 ファイルにつき 1 つの semantic concept にする。
- frontmatter は `id`, `type`, `title` だけにする。
- 構造化された事実は YAML fence に入れる。
- relation は本文中の `type:name` reference から導出する。
- 人間向けレビュー文書は source of truth にせず、export で生成する。

source corpus は小さく安定させます。一方で `.knowledge/.cache/` 以下の生成 cache は、agent が直接読むためではなく deterministic tool execution のためなので、verbose でも構いません。

## プロジェクト構成

典型的な構成:

```text
.knowledge/
  _schema/
    types.yaml
    categories.yaml
    enums.yaml
  <type>/
    <name>.md
  .cache/
    concepts.jsonl
    relations.jsonl
    index.jsonl
```

`assets/starter/.knowledge/` には schema files だけが入っています。sample concept は意図的に含めていません。新規プロジェクトで無関係な検索結果が混ざるのを避けるためです。

新しい concept を作るときは `assets/templates/concept.md` をコピー元として使います。

## 基本的な使い方

catalog を compile する:

```bash
python3 skills/knowledge-compiler/scripts/concept.py compile --project .
```

compiled concepts を検索する:

```bash
python3 skills/knowledge-compiler/scripts/concept.py search --project . access
python3 skills/knowledge-compiler/scripts/concept.py search --project . --type api access
```

1 つの concept と近い context を表示する:

```bash
python3 skills/knowledge-compiler/scripts/concept.py show --project . api:access-check --related --reverse
```

人間向け review Markdown を生成する:

```bash
python3 skills/knowledge-compiler/scripts/concept.py export --project . requirement:access-check --profile review --output review.md
```

## Authoring Rules

concept frontmatter:

```yaml
---
id: api:access-check
type: api
title: Access Check API
---
```

ルール:

- `id` は `type:name` 形式にする。
- `type` は lowercase にする。
- `id` prefix と `type` は一致させる。
- `role`, `category`, `format`, `editor`, tags, status, relations は frontmatter に書かない。
- role と category は `.knowledge/_schema/` から解決する。
- relation は prose または YAML の中に `type:name` reference として書く。
- `.knowledge` source では Markdown table を使わない。

## Multi-Agent Support

任意の repository support files を install できます。

```bash
python3 skills/knowledge-compiler/scripts/install_agent_support.py --project .
```

これにより以下のテンプレートが入ります。

- Claude Code custom agents
- GitHub Copilot instructions / reviewer agent
- generic `.agents/knowledge-compiler/` delegation prompts

offloading の優先順位:

1. deterministic Python scripts
2. lightweight read-only または single-file agents
3. schema design、cross-concept judgment、final approval は main reasoning model

## ライセンス

Knowledge Compiler の original skill content は **AGPL-3.0-or-later** でライセンスします。

vendored third-party libraries はそれぞれのライセンスに従います。完全な license / attribution files は `vendor/licenses/` に保存しています。

## バンドルしている Python 依存パッケージ

| 製品名 | バージョン | 作者／著作権者 | ライセンス |
| --- | --- | --- | --- |
| `fastjsonschema` | 2.21.2 | Michal Horejsek | BSD-3-Clause |
| `pyyaml-pure` | 0.1.0 | Ali Fadel / MilkStraw AI | MIT |

完全なライセンスおよび帰属表示は `vendor/licenses/` に保存しています。
