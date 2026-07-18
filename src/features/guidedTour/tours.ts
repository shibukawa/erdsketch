import type { Step } from "react-joyride";
import type { Locale } from "../../i18n/translations";

export type GuidedTourId = "erd" | "dfd" | "crud" | "collaboration" | "export" | "fields" | "models" | "vocabulary" | "vocabulary-registration";

export const guidedTourVersions: Record<GuidedTourId, number> = {
  erd: 2,
  dfd: 2,
  crud: 1,
  collaboration: 1,
  export: 1,
  fields: 1,
  models: 1,
  vocabulary: 2,
  "vocabulary-registration": 1
};

type Copy = { title: string; content: string };

const copy: Record<GuidedTourId, Record<Locale, Copy[]>> = {
  erd: {
    en: [
      { title: "ERD tools", content: "Create models, search the project, change card content, and edit the selected model here." },
      { title: "Create a model", content: "Enter a model name and press Enter to place a new model on this canvas." },
      { title: "ERD canvas", content: "Move and connect models here. Pan empty space and use pinch or Ctrl-wheel to zoom." },
      { title: "Model maturity", content: "Maturity shows how far a model has progressed from a rough seed to a matured logical model. Automatic maturity checks its name and description, primary key, field domains, and vocabulary names." },
      { title: "Create a relationship", content: "Press the link button at the lower-right of a model, then drag to another model to add a relationship." },
      { title: "Canvas annotations", content: "Use sticky notes, arrows, freehand drawing, and boundaries to record explanations or highlight areas without changing the ERD structure." },
      { title: "Project models", content: "Browse every project model, find its owner canvas, or place it on this canvas." },
      { title: "Vocabulary", content: "Maintain shared business, system, and physical names and inspect naming coverage." },
      { title: "Domains are reusable types", content: "Open the domain dictionary here. A domain is the mathematical and database concept corresponding to a programming-language type—not a domain from domain-driven design. Assigning one defines the kind and valid shape of values a field can hold." }
    ],
    ja: [
      { title: "ER図のツール", content: "ここでモデル作成、プロジェクト検索、カード表示の切替、選択モデルの編集を行います。" },
      { title: "モデルを作成", content: "モデル名を入力して Enter を押すと、このキャンバスへ新しいモデルを配置できます。" },
      { title: "ER図キャンバス", content: "モデルの移動や接続を行います。空白部分のドラッグで移動し、ピンチまたは Ctrl＋ホイールで拡大縮小できます。" },
      { title: "モデルの成熟度", content: "成熟度は、モデルがラフなアイデアから成熟した論理モデルへどこまで進んだかを表します。自動成熟度では、名前と説明、主キー、フィールドのドメイン、用語集の名前を確認します。" },
      { title: "関連を追加", content: "モデル右下のリンクボタンを押してから、関連付ける別のモデルまでドラッグすると関連を追加できます。" },
      { title: "キャンバスのアノテーション", content: "付箋、矢印、フリーハンド、境界線を使って、ER図の構造を変えずに説明を残したり注目範囲を示したりできます。" },
      { title: "プロジェクトのモデル", content: "すべてのモデルと所有キャンバスを確認し、現在のキャンバスへ配置できます。" },
      { title: "用語集", content: "ビジネス名・システム名・物理名を共有管理し、命名の適用状況を確認できます。" },
      { title: "ドメインは再利用できる型", content: "ここからドメイン辞書を開けます。ここでいうドメインはドメイン駆動設計のドメインではありません。数学・データベース用語のドメインで、プログラミング言語の「型」に相当し、フィールドが取り得る値の種類や形式を定義します。" }
    ]
  },
  dfd: {
    en: [
      { title: "DFD tools", content: "Create processes and data nodes, change their details, and review validation warnings here." },
      { title: "Create DFD items", content: "Choose a node type, enter a name, and add it to the current data-flow canvas." },
      { title: "Data-flow canvas", content: "Connect nodes to describe data movement. Arrows represent data, not execution order." },
      { title: "Create a data flow", content: "Press the link button at the lower-right of the source node, then drag to the node that receives the data." },
      { title: "Group complex flows", content: "Overlap nodes of the same type to group them. A flow connected to a group has the same effect as connecting it to every member, which keeps diagrams readable when flows become numerous." },
      { title: "Canvas annotations", content: "Use sticky notes, arrows, freehand drawing, and boundaries to add explanations without changing the modeled data flows." },
      { title: "Project models", content: "Search the shared model catalog and place an existing model in this DFD." }
    ],
    ja: [
      { title: "DFDのツール", content: "ここでプロセスやデータ要素の作成、詳細編集、検証警告の確認を行います。" },
      { title: "DFD要素を作成", content: "種類と名前を選び、現在のデータフローキャンバスへ追加します。" },
      { title: "データフローキャンバス", content: "要素を接続してデータの移動を表します。矢印は処理順序ではなくデータの流れです。" },
      { title: "データフローを追加", content: "送信元ノードの右下にあるリンクボタンを押してから、データを受信するノードまでドラッグするとデータフローを追加できます。" },
      { title: "複雑なフローをグループ化", content: "同じ種類のノード同士を重ねるとグループ化されます。グループへの矢印は全要素へ線をつないだのと同じ効果があり、データフローが増えて複雑になった図を整理できます。" },
      { title: "キャンバスのアノテーション", content: "付箋、矢印、フリーハンド、境界線を使って、データフロー自体を変えずに説明や補足を加えられます。" },
      { title: "プロジェクトのモデル", content: "共有モデルカタログを検索し、既存モデルをDFDへ配置できます。" }
    ]
  },
  crud: {
    en: [
      { title: "CRUD Matrix", content: "This matrix shows which tables each process accesses and whether it creates, reads, updates, or deletes their data." },
      { title: "Generated from the DFD", content: "Rows and columns are built from DFD processes, models, and the CRUD operations assigned to their data flows." },
      { title: "Use it for investigation", content: "When processing is slow or data becomes inconsistent, use the matrix to narrow down which processes access the affected tables and may need debugging." }
    ],
    ja: [
      { title: "CRUDマトリクス", content: "各プロセスがどのテーブルへアクセスし、そのデータを作成・参照・更新・削除するかを一覧で確認できます。" },
      { title: "DFDから生成", content: "行と列はDFDのプロセスとモデル、各データフローに設定したCRUD定義から作られます。" },
      { title: "調査やデバッグに活用", content: "処理が遅いときやデータがおかしくなったときに、影響を受けたテーブルへアクセスするプロセスを絞り込み、疑わしい処理を見つけやすくします。" }
    ]
  },
  collaboration: {
    en: [
      { title: "Peer-to-peer co-editing", content: "Co-work uses WebRTC to connect browsers directly for simultaneous editing. Project changes are exchanged peer to peer while the session is connected." },
      { title: "Exchange connection information", content: "Send the invitation URL to another person. When they return an answer URL, open it in another tab, or paste the returned URL or code into this dialog to establish the connection." },
      { title: "STUN and TURN", content: "The default public STUN servers may not connect through every network or NAT. A TURN server that you operate can relay traffic and usually provides a more reliable connection." },
      { title: "Your visible name", content: "Change your name at the upper-right of the workspace. Other collaborators will see the updated name on cursors, edits, and the participant list." }
    ],
    ja: [
      { title: "P2Pで同時編集", content: "共同編集ではWebRTCを使ってブラウザ同士を直接接続し、同時編集を行います。接続中はプロジェクトの変更内容がP2Pで交換されます。" },
      { title: "接続情報を交換", content: "招待URLを相手へ送ります。相手から回答URLが返ってきたら別タブで開くか、返ってきたURLまたはコードをこのダイアログへ入力すると通信が成立します。" },
      { title: "STUNとTURN", content: "標準の公開STUNサーバーでは、ネットワークやNATの環境によって接続できない場合があります。自前で用意したTURNサーバーを使うと通信を中継でき、接続の確実性が高まります。" },
      { title: "他の人に見える名前", content: "ワークスペース右上の名前を変更すると、カーソル、編集中の表示、参加者一覧で他の共同編集者に見える名前を変更できます。" }
    ]
  },
  export: {
    en: [
      { title: "Export project artifacts", content: "Export the current project as editable diagrams, documentation, normalized JSON, or SQL DDL." },
      { title: "Choose an export format", content: "Diagram creates a multi-sheet draw.io file. Document creates a ZIP of Markdown and SVG files. JSON supports code generation, and SQL creates DDL for selected database dialects." },
      { title: "Configure the output", content: "Options for the selected format appear here. Diagram and document exports can use business, system, or physical names and choose the model-card content." },
      { title: "Generate and download", content: "Press Export to generate the selected artifact. SQL validation findings appear in this dialog before a download is produced." }
    ],
    ja: [
      { title: "プロジェクトをエクスポート", content: "現在のプロジェクトを、編集可能な図、ドキュメント、正規化JSON、SQL DDLとして出力できます。" },
      { title: "出力形式を選択", content: "Diagramは複数シートのdraw.ioファイル、DocumentはMarkdownとSVGのZIP、JSONはコード生成向けデータ、SQLは選択したデータベース向けのDDLを作成します。" },
      { title: "出力内容を設定", content: "選択した形式の設定がここに表示されます。DiagramとDocumentでは、ビジネス名・システム名・物理名や、モデルカードへ含める内容を選択できます。" },
      { title: "生成してダウンロード", content: "Exportを押すと選択した成果物を生成します。SQLに検証上の問題がある場合は、ダウンロード前にこのダイアログへ表示されます。" }
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
      { title: "Business and system names", content: "Use a business name for the term people use in the business, and a system name for the term used in software. Keeping both is useful when industry terminology differs from system terminology, or when business and system languages differ." },
      { title: "Physical names", content: "Use the physical name for the database or symbol form—for example, an all-lowercase name or an abbreviation chosen to keep identifiers short." },
      { title: "Add a term", content: "Enter a business name and press Enter. System and physical names can be completed later." },
      { title: "Usage coverage", content: "Find unmatched or incomplete names and open the action needed to resolve each one." }
    ],
    ja: [
      { title: "プロジェクト用語集", content: "再利用する命名用語を管理し、プロジェクト内での使用箇所を確認します。" },
      { title: "単語一覧と使用状況", content: "単語一覧で正式な用語を編集し、使用状況で命名の適用範囲を確認します。" },
      { title: "ビジネス用語とシステム用語", content: "ビジネス用語には業務で使う言葉、システム用語にはソフトウェア内で使う言葉を登録します。業界専門用語とシステム上の呼び名が異なる場合や、業務とシステムで英語・他国語を使い分ける場合に両方を管理できます。" },
      { title: "物理名", content: "物理名にはデータベースやシンボルで使う表記を登録します。全部小文字にした名前や、シンボル名を短くするための略称などを指定できます。" },
      { title: "用語を追加", content: "ビジネス名を入力して Enter を押します。システム名と物理名は後から補完できます。" },
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
  erd: ["[data-tour='erd-sidebar']", "[data-tour='erd-quick-create']", "[data-tour='erd-canvas']", "[data-tour='erd-canvas']", "[data-tour='erd-canvas']", "[data-tour='annotation-toolbar']", "[data-tour='erd-models']", "[data-tour='erd-vocabulary']", "[data-tour='erd-domains']"],
  dfd: ["[data-tour='dfd-sidebar']", "[data-tour='dfd-quick-create']", "[data-tour='dfd-canvas']", "[data-tour='dfd-canvas']", "[data-tour='dfd-canvas']", "[data-tour='annotation-toolbar']", "[data-tour='dfd-models']"],
  crud: ["[data-tour='crud-dialog'] header", "[data-tour='crud-matrix']", "[data-tour='crud-matrix']"],
  collaboration: ["[data-tour='collaboration-dialog'] header", "[data-tour='collaboration-connection']", "[data-tour='collaboration-connection']", "[data-tour='collaborator-name']"],
  export: ["[data-tour='export-dialog'] header", "[data-tour='export-formats']", "[data-tour='export-options']", "[data-tour='export-actions']"],
  fields: ["[data-tour='field-dialog'] header", "[data-tour='field-quick-entry']", "[data-tour='field-dialog'] .field-list-scroll", "[data-tour='field-dialog'] aside"],
  models: ["[data-tour='model-catalog'] .modal-box > header", "[data-tour='model-filters']", "[data-tour='model-catalog'] table"],
  vocabulary: ["[data-tour='vocabulary-dialog'] header", "[data-tour='vocabulary-tabs']", "[data-tour='vocabulary-tabs']", "[data-tour='vocabulary-tabs']", "[data-tour='vocabulary-quick-entry']", "[data-tour='vocabulary-tabs'] button[data-tab='usage']"],
  "vocabulary-registration": ["[data-tour='vocabulary-registration'] header", "[data-tour='vocabulary-segmentation']", "[data-tour='vocabulary-segments']", "[data-tour='vocabulary-register']"]
};

export function getGuidedTourSteps(id: GuidedTourId, locale: Locale): Step[] {
  return copy[id][locale].map((item, index) => {
    const target = targets[id][index];
    const isCanvasStep = target === "[data-tour='erd-canvas']" || target === "[data-tour='dfd-canvas']";
    return {
      id: `${id}-${index + 1}`,
      target,
      title: item.title,
      content: item.content,
      placement: isCanvasStep ? "center" : index === 0 ? (id === "erd" || id === "dfd" ? "right" : "bottom") : "auto"
    };
  });
}
