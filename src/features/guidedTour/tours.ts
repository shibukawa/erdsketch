import type { Step } from "react-joyride";
import type { Locale } from "../../i18n/translations";

export type GuidedTourId = "erd" | "dfd" | "fields" | "models" | "vocabulary" | "vocabulary-registration";

export const guidedTourVersions: Record<GuidedTourId, number> = {
  erd: 1,
  dfd: 1,
  fields: 1,
  models: 1,
  vocabulary: 1,
  "vocabulary-registration": 1
};

type Copy = { title: string; content: string };

const copy: Record<GuidedTourId, Record<Locale, Copy[]>> = {
  erd: {
    en: [
      { title: "ERD tools", content: "Create models, search the project, change card content, and edit the selected model here." },
      { title: "Create a model", content: "Enter a model name and press Enter to place a new model on this canvas." },
      { title: "ERD canvas", content: "Move and connect models here. Pan empty space and use pinch or Ctrl-wheel to zoom." },
      { title: "Project models", content: "Browse every project model, find its owner canvas, or place it on this canvas." },
      { title: "Vocabulary", content: "Maintain shared business, system, and physical names and inspect naming coverage." }
    ],
    ja: [
      { title: "ER図のツール", content: "ここでモデル作成、プロジェクト検索、カード表示の切替、選択モデルの編集を行います。" },
      { title: "モデルを作成", content: "モデル名を入力して Enter を押すと、このキャンバスへ新しいモデルを配置できます。" },
      { title: "ER図キャンバス", content: "モデルの移動や接続を行います。空白部分のドラッグで移動し、ピンチまたは Ctrl＋ホイールで拡大縮小できます。" },
      { title: "プロジェクトのモデル", content: "すべてのモデルと所有キャンバスを確認し、現在のキャンバスへ配置できます。" },
      { title: "用語集", content: "業務名・システム名・物理名を共有管理し、命名の適用状況を確認できます。" }
    ]
  },
  dfd: {
    en: [
      { title: "DFD tools", content: "Create processes and data nodes, change their details, and review validation warnings here." },
      { title: "Create DFD items", content: "Choose a node type, enter a name, and add it to the current data-flow canvas." },
      { title: "Data-flow canvas", content: "Connect nodes to describe data movement. Arrows represent data, not execution order." },
      { title: "Project models", content: "Search the shared model catalog and place an existing model in this DFD." }
    ],
    ja: [
      { title: "DFDのツール", content: "ここでプロセスやデータ要素の作成、詳細編集、検証警告の確認を行います。" },
      { title: "DFD要素を作成", content: "種類と名前を選び、現在のデータフローキャンバスへ追加します。" },
      { title: "データフローキャンバス", content: "要素を接続してデータの移動を表します。矢印は処理順序ではなくデータの流れです。" },
      { title: "プロジェクトのモデル", content: "共有モデルカタログを検索し、既存モデルをDFDへ配置できます。" }
    ]
  },
  fields: {
    en: [
      { title: "Model fields", content: "Capture and edit the fields that belong to this model." },
      { title: "Quick field entry", content: "Enter a field name and press Enter. The input stays ready for the next field." },
      { title: "Field list", content: "Select a row to edit names, keys, constraints, defaults, domains, and capacity details." },
      { title: "Field tools", content: "Switch between field definition, reusable domains, and model-refinement patterns." }
    ],
    ja: [
      { title: "モデルのフィールド", content: "このモデルに属するフィールドを素早く登録・編集します。" },
      { title: "フィールドを連続入力", content: "フィールド名を入力して Enter を押します。登録後も次の入力を続けられます。" },
      { title: "フィールド一覧", content: "行を選択すると、名前、キー、制約、既定値、ドメイン、容量情報を編集できます。" },
      { title: "フィールド用ツール", content: "フィールド定義、再利用可能なドメイン、モデル改善パターンを切り替えます。" }
    ]
  },
  models: {
    en: [
      { title: "Project model catalog", content: "Review models shared by every ERD and DFD canvas in this project." },
      { title: "Find models", content: "Search by name or role, or limit the list to models placed on one canvas." },
      { title: "Ownership and placement", content: "Open a placement, place a model here, or transfer its owner canvas." }
    ],
    ja: [
      { title: "プロジェクトモデル一覧", content: "プロジェクト内のER図・DFDで共有されるモデルを確認します。" },
      { title: "モデルを検索", content: "名前や役割で検索し、特定のキャンバスに配置されたモデルだけに絞り込めます。" },
      { title: "所有と配置", content: "配置先を開く、現在のキャンバスへ配置する、所有キャンバスを移す操作ができます。" }
    ]
  },
  vocabulary: {
    en: [
      { title: "Project vocabulary", content: "Manage reusable naming terms and inspect where they are used in the project." },
      { title: "Word list and usage", content: "Edit authoritative terms in Word list, then inspect naming coverage in Usage." },
      { title: "Add a term", content: "Enter a business name and press Enter. System and physical names can be completed later." },
      { title: "Usage coverage", content: "Find unmatched or incomplete names and open the action needed to resolve each one." }
    ],
    ja: [
      { title: "プロジェクト用語集", content: "再利用する命名用語を管理し、プロジェクト内での使用箇所を確認します。" },
      { title: "単語一覧と使用状況", content: "単語一覧で正式な用語を編集し、使用状況で命名の適用範囲を確認します。" },
      { title: "用語を追加", content: "業務名を入力して Enter を押します。システム名と物理名は後から補完できます。" },
      { title: "使用状況", content: "未一致・未完成の名前を見つけ、それぞれに必要な修正操作を開けます。" }
    ]
  },
  "vocabulary-registration": {
    en: [
      { title: "Register unmatched vocabulary", content: "Split an unmatched name into reusable dictionary terms." },
      { title: "Choose boundaries", content: "Insert | between terms. Remove every separator to register the whole phrase." },
      { title: "Choose terms", content: "Selected segments become vocabulary entries. Click a segment to leave it unmatched." },
      { title: "Register", content: "Save the selected terms and bind them back to the original model name." }
    ],
    ja: [
      { title: "未登録用語を登録", content: "一致しない名前を、再利用できる辞書用語へ分割します。" },
      { title: "区切りを指定", content: "用語の間へ | を入力します。すべて外すと語句全体を登録します。" },
      { title: "登録する用語を選択", content: "選択された区切りが用語になります。クリックすると未一致のまま残せます。" },
      { title: "登録", content: "選択した用語を保存し、元のモデル名へ関連付けます。" }
    ]
  }
};

const targets: Record<GuidedTourId, string[]> = {
  erd: ["[data-tour='erd-sidebar']", "[data-tour='erd-quick-create']", "[data-tour='erd-canvas']", "[data-tour='erd-models']", "[data-tour='erd-vocabulary']"],
  dfd: ["[data-tour='dfd-sidebar']", "[data-tour='dfd-quick-create']", "[data-tour='dfd-canvas']", "[data-tour='dfd-models']"],
  fields: ["[data-tour='field-dialog'] header", "[data-tour='field-quick-entry']", "[data-tour='field-dialog'] .field-list-scroll", "[data-tour='field-dialog'] aside"],
  models: ["[data-tour='model-catalog'] .modal-box > header", "[data-tour='model-filters']", "[data-tour='model-catalog'] table"],
  vocabulary: ["[data-tour='vocabulary-dialog'] header", "[data-tour='vocabulary-tabs']", "[data-tour='vocabulary-quick-entry']", "[data-tour='vocabulary-tabs'] button[data-tab='usage']"],
  "vocabulary-registration": ["[data-tour='vocabulary-registration'] header", "[data-tour='vocabulary-segmentation']", "[data-tour='vocabulary-segments']", "[data-tour='vocabulary-register']"]
};

export function getGuidedTourSteps(id: GuidedTourId, locale: Locale): Step[] {
  return copy[id][locale].map((item, index) => ({
    id: `${id}-${index + 1}`,
    target: targets[id][index],
    title: item.title,
    content: item.content,
    placement: index === 0 ? (id === "erd" || id === "dfd" ? "right" : "bottom") : "auto"
  }));
}
