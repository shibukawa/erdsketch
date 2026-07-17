import assert from "node:assert/strict";
import test from "node:test";
import { dependencyLabels } from "../src/features/modeling/constants.ts";
import { getModelStageLabel } from "../src/features/modeling/utils.ts";
import { resolveLocale, translateText } from "../src/i18n/translations.ts";

test("known interface text switches between Japanese and English", () => {
  assert.equal(translateText("Models", "ja"), "モデル");
  assert.equal(translateText("Models", "en"), "Models");
  assert.equal(translateText("Locked by you — editing enabled", "ja"), "自分がロック中 — 編集できます");
  assert.equal(translateText("Choose how the collaborator can connect.", "ja"), "共同作業者の接続方法を選択してください。");
});

test("unknown interface text falls back to its English source", () => {
  assert.equal(translateText("Future untranslated control", "ja"), "Future untranslated control");
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
  assert.equal(getModelStageLabel(3.5), "Conceptual model");
  assert.equal(getModelStageLabel(1.25), "Logical model");
  assert.equal(getModelStageLabel(0.5), "Matured model");
  assert.equal(translateText(getModelStageLabel(6), "ja"), "ラフモデル");
  assert.equal(translateText(getModelStageLabel(3.5), "ja"), "概念モデル");
  assert.equal(translateText(getModelStageLabel(1.25), "ja"), "論理モデル");
  assert.equal(translateText(getModelStageLabel(0.5), "ja"), "完成モデル");
});

test("model roles use familiar Japanese loanwords", () => {
  assert.equal(translateText("summary", "ja"), "サマリー");
  assert.equal(translateText("work", "ja"), "ワーク");
});

test("privacy terminology is presented as personal information in Japanese", () => {
  assert.equal(translateText("Privacy", "ja"), "個人情報");
  assert.equal(
    translateText("Mark this model as containing privacy-sensitive information.", "ja"),
    "このモデルに個人情報が含まれることを示します。"
  );
});

test("dictionary, navigation, and DFD terminology are localized", () => {
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
