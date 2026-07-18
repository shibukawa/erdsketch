import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { dependencyLabels } from "../src/features/modeling/constants.ts";
import { getModelStageLabel } from "../src/features/modeling/utils.ts";
import { resolveLocale, translateText } from "../src/i18n/translations.ts";

test("known interface text switches between Japanese and English", () => {
  assert.equal(translateText("Models", "ja"), "モデル");
  assert.equal(translateText("Models", "en"), "Models");
  assert.equal(translateText("Locked by you — editing enabled", "ja"), "自分がロック中 — 編集できます");
  assert.equal(translateText("Choose how the collaborator can connect.", "ja"), "共同作業者の接続方法を選択してください。");
  assert.equal(translateText("Done", "ja"), "完了");
  assert.equal(translateText("Edit annotation geometry", "ja"), "注釈の形状を編集");
  assert.equal(translateText("Delete selected stroke", "ja"), "選択したストロークを削除");
});

test("AI assistant controls are localized", () => {
  assert.equal(translateText("AI assistant", "ja"), "AIアシスタント");
  assert.equal(translateText("Ask AI about this canvas", "ja"), "このキャンバスについてAIに質問");
  assert.equal(translateText("Local OpenAI-compatible server", "ja"), "ローカルOpenAI互換サーバー");
  assert.equal(translateText("Server URL", "ja"), "サーバーURL");
  assert.equal(translateText("Test connection to load models", "ja"), "接続確認でモデルを取得");
  assert.equal(translateText("Connected. Models loaded.", "ja"), "接続しました。モデル一覧を取得しました。");
  assert.equal(translateText("Project context is sent only when you press Send.", "ja"), "プロジェクト情報は送信ボタンを押したときだけ送られます。");
});

test("unknown interface text falls back to its English source", () => {
  assert.equal(translateText("Future untranslated control", "ja"), "Future untranslated control");
});

test("authored content that collides with interface terms has explicit localization boundaries", async () => {
  assert.equal(translateText("Display", "ja"), "表示");
  assert.equal(translateText("Name", "ja"), "名前");
  const boundaries = [
    ["../src/components/diagram/SeedInspector.tsx", /data-i18n-skip[^>]*>\{seed\.title\}/],
    ["../src/components/diagram/MaturityValidation.tsx", /data-i18n-skip[^>]*>\{issue\.label\}/],
    ["../src/components/diagram/VocabularyDisplayName.tsx", /data-i18n-skip/],
    ["../src/components/dfd/DfdNodeCard.tsx", /data-i18n-skip[^>]*>\{title\}/],
    ["../src/components/layout/WorkspaceProjectNavigation.tsx", /data-i18n-skip[^>]*>\{canvasName\}/],
    ["../src/components/layout/ProjectCanvasSelectorDialog.tsx", /data-i18n-skip[^>]*>\{canvas\.name\}/],
    ["../src/components/collaboration/CoworkParticipantSummary.tsx", /data-i18n-skip[^>]*>\{user\.name\}/],
    ["../src/components/ai/AiChatWindow.tsx", /data-i18n-skip[^>]*>\{message\.text\}/]
  ];
  for (const [path, pattern] of boundaries) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    assert.match(source, pattern, path);
  }
  const provider = await readFile(new URL("../src/i18n/I18nProvider.tsx", import.meta.url), "utf8");
  assert.match(provider, /root\.parentElement\?\.closest\("\[data-i18n-skip\]"\)/);
});

test("dynamic accessibility text preserves its runtime value", () => {
  assert.equal(translateText("Show all 3 Co-work participants", "ja"), "共同作業の参加者 3 人をすべて表示");
});

test("saved locale wins and Japanese browser preference is detected", () => {
  assert.equal(resolveLocale("en", ["ja-JP"]), "en");
  assert.equal(resolveLocale(null, ["ja-JP", "en-US"]), "ja");
  assert.equal(resolveLocale("invalid", ["fr-FR"]), "en");
});

test("table type and model stage terminology use canonical display labels", () => {
  assert.equal(dependencyLabels.independent, "Parent table");
  assert.equal(dependencyLabels.dependent, "Dependent table");
  assert.equal(translateText(dependencyLabels.independent, "ja"), "親テーブル");
  assert.equal(translateText(dependencyLabels.dependent, "ja"), "従属テーブル");
  assert.equal(getModelStageLabel(6), "Model seed");
  assert.equal(getModelStageLabel(3.5), "Concept model");
  assert.equal(getModelStageLabel(1.25), "Logical model");
  assert.equal(getModelStageLabel(0.5), "Matured model");
  assert.equal(translateText(getModelStageLabel(6), "ja"), "ラフモデル");
  assert.equal(translateText(getModelStageLabel(3.5), "ja"), "概念モデル");
  assert.equal(translateText(getModelStageLabel(1.25), "ja"), "論理モデル");
  assert.equal(translateText(getModelStageLabel(0.5), "ja"), "完成モデル");
});

test("language-sensitive collaboration and ERD card labels use canonical sources", async () => {
  const cowork = await readFile(new URL("../src/components/collaboration/CoworkParticipantSummary.tsx", import.meta.url), "utf8");
  assert.match(cowork, /translateText\("Co-work", locale\)/);
  assert.match(cowork, /translateText\(online \? "Connected" : "Disconnected", locale\)/);
  const workspaceHeader = await readFile(new URL("../src/components/layout/WorkspaceHeader.tsx", import.meta.url), "utf8");
  const dfdHeader = await readFile(new URL("../src/components/dfd/DfdWorkspaceHeader.tsx", import.meta.url), "utf8");
  assert.match(workspaceHeader, /translateText\(connected \? "Connected" : "Connecting", locale\)/);
  assert.match(dfdHeader, /translateText\(connected \? "Connected" : "Connecting", locale\)/);
  const modelCard = await readFile(new URL("../src/components/diagram/ModelSeedCard.tsx", import.meta.url), "utf8");
  assert.match(modelCard, /translateText\(tag === seed\.dependency \? dependencyLabels\[seed\.dependency\] : tag, locale\)/);
  assert.doesNotMatch(modelCard, />\{tag\}<\/span>/);
});

test("ERD sidebar sections and maturity guidance use Japanese product labels", () => {
  assert.equal(translateText("Edit", "ja"), "編集");
  assert.equal(translateText("Validation", "ja"), "バリデーション");
  assert.equal(translateText("Model content", "ja"), "モデル内表示");
  assert.equal(translateText("Identifier display", "ja"), "識別子表示");
  assert.equal(translateText("Change the default model description.", "ja"), "デフォルトのモデル説明を変更してください。");
  assert.equal(translateText("Select at least one primary-key field.", "ja"), "主キーフィールドを1つ以上選択してください。");
});

test("model roles use familiar Japanese loanwords", () => {
  assert.equal(translateText("summary", "ja"), "サマリー");
  assert.equal(translateText("work", "ja"), "ワーク");
});

test("privacy terminology is presented as personal information in Japanese", () => {
  assert.equal(translateText("Privacy", "ja"), "個人情報");
  assert.equal(translateText("privacy", "ja"), "個人情報");
  assert.equal(
    translateText("Mark this model as containing privacy-sensitive information.", "ja"),
    "このモデルに個人情報が含まれることを示します。"
  );
});

test("dictionary, navigation, and DFD terminology are localized", () => {
  assert.equal(translateText("Business", "ja"), "ビジネス名");
  assert.equal(translateText("Show business names", "ja"), "ビジネス名を表示");
  assert.equal(translateText("Type business name and press Enter", "ja"), "ビジネス名を入力して Enter");
  assert.equal(translateText("ERD Sketch", "ja"), "ER図");
  assert.equal(translateText("Data Flow", "ja"), "データフロー図");
  assert.equal(translateText("External entity", "ja"), "外部エンティティ");
  assert.equal(translateText("Unmatched", "ja"), "未一致");
  assert.equal(translateText("Complete", "ja"), "完了");
  assert.equal(translateText("3 fields", "ja"), "3 フィールド");
  assert.equal(translateText("32 bit", "ja"), "32 ビット");
  assert.equal(translateText("Entity relationship diagrams", "ja"), "ER 図");
  assert.equal(translateText("Select canvas, current canvas: Main", "ja"), "キャンバスを選択、現在のキャンバス: Main");
  assert.equal(translateText("Primitive", "ja"), "プリミティブ");
  assert.equal(translateText("User Defined", "ja"), "ユーザー定義");
  assert.equal(translateText("Enter", "ja"), "Enter");
  assert.equal(translateText("Key fields", "ja"), "主要項目");
  assert.equal(translateText("Insert a data node for process collaboration", "ja"), "プロセス間連携にデータノードを挿入");
  assert.equal(translateText("Insert process between data entities", "ja"), "データエンティティ間にプロセスを挿入");
  assert.equal(translateText("Why this dialog appeared", "ja"), "このダイアログが表示された理由");
  assert.equal(translateText("DFD data entity nodes (files, tables, and queues) cannot connect directly to each other.", "ja"), "DFDではデータエンティティノード同士（ファイル、テーブル、キュー）を直接接続することはできません。");
  assert.equal(translateText("DFD process nodes (batch and UI) cannot connect directly to each other.", "ja"), "DFDではプロセスノード同士（バッチ、UI）を直接接続することはできません。");
  assert.equal(translateText("When multiple processes work together, represent them as physical processes within a node.", "ja"), "複数プロセスが連携している場合は、ノード内の物理プロセスとして表現してください。");
});

test("workspace start panel terminology is localized", () => {
  assert.equal(translateText("Start or open a project", "ja"), "プロジェクトを開始または開く");
  assert.equal(translateText("Create new", "ja"), "新規作成");
  assert.equal(translateText("Recent projects", "ja"), "最近のプロジェクト");
  assert.equal(translateText("View all projects", "ja"), "すべてのプロジェクトを表示");
  assert.equal(
    translateText("Upload a portable ZIP project archive. Direct local access is available only after you choose a project folder.", "ja"),
    "ポータブルな ZIP 形式のプロジェクトアーカイブをアップロードします。ローカルへの直接アクセスは、プロジェクトフォルダを選択した後にのみ利用できます。",
  );
  assert.equal(translateText("Upload project archive", "ja"), "プロジェクトアーカイブをアップロード");
  assert.equal(translateText("Open project folder", "ja"), "プロジェクトフォルダを開く");
  assert.equal(translateText("Manage projects", "ja"), "プロジェクトを管理");
  assert.equal(translateText("5 models", "ja"), "5 モデル");
  assert.equal(translateText("Resume", "ja"), "再開");
});

test("local tab session and recovery guidance are localized", () => {
  assert.equal(translateText("Leave this editing session?", "ja"), "この編集セッションから退出しますか？");
  assert.equal(translateText("You are editing Demo project through its host tab.", "ja"), "Demo project をホストタブ経由で編集中です。");
  assert.equal(
    translateText("Recovery storage error: The host tab closed or stopped responding. Reload to reopen the project after its editing lock is released.", "ja"),
    "リカバリストレージエラー: ホストタブが閉じたか応答しなくなりました。編集ロックが解放された後、再読み込みしてプロジェクトを開き直してください。"
  );
});

test("draw.io export controls and project context are localized", () => {
  assert.equal(translateText("Editable draw.io diagrams", "ja"), "編集可能な draw.io 図");
  assert.equal(translateText("Select all", "ja"), "すべて選択");
  assert.equal(translateText("Primary keys", "ja"), "主キー");
  assert.equal(
    translateText("Choose ERD, DFD, and CRUD diagrams from Todo starter. Every shape and connector remains editable.", "ja"),
    "Todo starter の ERD・DFD・CRUD 図を選択します。すべての図形と接続線を編集できます。"
  );
  assert.equal(
    translateText("All ERD, DFD, and CRUD diagrams from Todo starter are exported in one draw.io file. Each diagram opens as a separate sheet.", "ja"),
    "Todo starter のすべての ERD・DFD・CRUD 図を1つの draw.io ファイルに出力します。各図は別シートで開きます。"
  );
  assert.equal(translateText("One file, multiple sheets", "ja"), "1ファイル、複数シート");
  assert.equal(translateText("Models as CRUD columns", "ja"), "CRUDの列にモデルを配置");
  assert.equal(
    translateText("Turn off to place processes in columns. The current CRUD Matrix orientation is selected initially.", "ja"),
    "オフにするとプロセスを列に配置します。現在の CRUD マトリクスの向きが初期選択されます。"
  );
});

test("document, JSON, and SQL export descriptions are localized", () => {
  assert.equal(translateText("Markdown document bundle", "ja"), "Markdown ドキュメント一式");
  assert.equal(
    translateText("Downloads Markdown inventories, ERD/DFD/CRUD SVG files, and the manifest as one ZIP.", "ja"),
    "Markdown の一覧、ERD・DFD・CRUD の SVG ファイル、マニフェストを1つの ZIP としてダウンロードします。"
  );
  assert.equal(translateText("Code-generation JSON", "ja"), "コード生成用 JSON");
  assert.equal(
    translateText("Downloads normalized JSON only. JSON Schema bundle generation is not connected yet.", "ja"),
    "正規化済み JSON のみをダウンロードします。JSON Schema 一式の生成は未対応です。"
  );
  assert.equal(translateText("Select one or more database dialects.", "ja"), "データベース方言を1つ以上選択してください。");
});

test("capacity inputs, projections, and estimate details are localized", () => {
  assert.equal(translateText("Expected inserts", "ja"), "想定追加件数");
  assert.equal(translateText("Expected net increase", "ja"), "想定純増件数");
  assert.equal(translateText("(optional)", "ja"), "（任意）");
  assert.equal(translateText("Now", "ja"), "現在");
  assert.equal(translateText("1 month", "ja"), "1 か月後");
  assert.equal(translateText("3 years", "ja"), "3 年後");
  assert.equal(translateText("Payload", "ja"), "ペイロード");
  assert.equal(translateText("+ generic overhead", "ja"), "＋ 一般的なオーバーヘッド");
  assert.equal(translateText("configured +", "ja"), "設定済み ＋");
  assert.equal(translateText("from PK/UNIQUE", "ja"), "PK／UNIQUE 由来");
  assert.equal(translateText("Set a domain for: order_number, ordered_at.", "ja"), "ドメインが設定されていません: order_number, ordered_at。");
  assert.equal(translateText("Complete the domain definition for: address.", "ja"), "ドメインの物理型の設定を行ってください: address。");
  assert.equal(translateText("Set estimated average size for: notes.", "ja"), "Text／Blob といった可変要素では、推定平均サイズを設定してください: notes。");
});

test("CRUD heatmap controls and SELECT-cost caution are localized", () => {
  assert.equal(translateText("Process / Model", "ja"), "プロセス / モデル");
  assert.equal(translateText("Model / Process", "ja"), "モデル / プロセス");
  assert.equal(translateText("Heatmap basis", "ja"), "ヒートマップの計算基準");
  assert.equal(translateText("Record count", "ja"), "レコード数");
  assert.equal(translateText("Storage size", "ja"), "ストレージサイズ");
  assert.equal(translateText("Record count: 12,345 · Table size: 2.5 GiB", "ja"), "レコード数: 12,345 · テーブルサイズ: 2.5 GiB");
  assert.equal(
    translateText("Heatmap values are only rough indications of SELECT query cost. Actual cost can differ substantially depending on index access, WHERE-clause selectivity, and multi-table join order or loop strategy.", "ja"),
    "ヒートマップは SELECT クエリーの重さの大まかな目安です。実際の負荷は、インデックスアクセス、WHERE 句の絞り込み、複数テーブルの結合順序やループ戦略によって大きく変わります。"
  );
});
