# dynamic_graph_explore

Alluvial と Graph Layout が連動する可視化プログラム

## 0. 目的

* Alluvial（D3）上の範囲選択・クリックと、グラフ（Sigma.js）の表示を連動させる。
* グラフはCSVで与えられた固定座標どおりに描画し、cluster（コミュニティ）別に色分けする。
* バックエンドは FastAPI。フロントは React + TypeScript + Zustand + D3 + Sigma.js v2。

---

## 1. アーキテクチャ

* バックエンド：FastAPI(Python)
  * データ配信（CSV/Arrow/JSON）、静的ファイル（初期はCSV）配信。
* フロント：Next.js（React/Javascript）
  * Alluvial：D3（`d3-sankey`ベース）
  * グラフ：Sigma.js v2
  * 状態管理：Zustand（選択状態・時刻範囲・フィルタ条件の単一ソース）
  * データ処理：最初は配列filter
* 連携：Alluvialのイベント → Zustandに反映 → Graphコンポーネントが購読して差分更新。

---

## 2. データモデル（契約）

### 2.1 ノード（CSV）

`nodes.csv`

```
node_id,x,y,time,cluster,label
1,12.34,-7.89,2021Q1,C3,Alice
```

* `x,y`：画面座標（px換算前、Sigmaにそのまま渡す数値）
* `time`：スナップショット識別子（例: 2021Q1 / 202101 など）
* `cluster`：クラスタID（色分けに使用）
* `label`：任意

### 2.2 エッジ（CSV）

`edges.csv`

```
src,dst,time
1,2,2021Q1
```

### 2.3 Alluvialノード

`alluvial_nodes.csv`

```
time,community_id,size,label
2021Q1,C3,128,"Comm 3"
```

### 2.4 Alluvial遷移（バンド）

`alluvial_links.csv`

```
time_from,comm_id_from,time_to,comm_id_to,weight
2021Q1,C3,2021Q2,C7,52
```

> 注：将来の拡張に備えて、**Arrow/Parquet**出力も許可（転送・パース高速化）。

---

## 3. API仕様（FastAPI）

### 3.1 静的配信（初期）

* `GET /data/nodes`
* `GET /data/edges`
* `GET /data/alluvial-nodes`
* `GET /data/alluvial-links`

### 3.2 動的フィルタ（任意・規模拡大後）

* `GET /graph/nodes?time=2021Q1` → 該当時刻のノード（JSON/Arrow）
* `GET /graph/edges?time=2021Q1` → 該当時刻のエッジ
* `GET /alluvial?from=2021Q1&to=2021Q3` → 表示範囲のノード/遷移

**レスポンス例（JSON）**

```json
{
  "nodes": [{"id":"n001","x":12.3,"y":-7.8,"cluster":"C3","label":"Alice"}],
  "edges": [{"src":"n001","dst":"n045","weight":3}]
}
```

---

## 4. フロント仕様

### 4.1 Zustand ストア（概略）

```ts
type VizState = {
  timeRange: [string, string];         // 例: ["2021Q1","2021Q3"]
  selectedCommunities: Set<string>;    // Alluvialで選ばれた community/cluster
  highlightedNodeIds: Set<string>;     // 任意（ノード検索等）
  setBrush(range: [string,string]): void;
  toggleCommunity(id: string): void;
  clearSelection(): void;
};
```

### 4.2 Alluvial（D3）

* 機能：
  * ブラッシング(後述)
  * バンド/ノードクリックで `toggleCommunity(community_id)`。解除はクリアボタン。
  * ツールチップ（サイズ・遷移量・割合）
* イベント：

  * `onBrush(range: [string,string])`
  * `onCommunityClick(id: string)`


#### 4.3 ブラッシング

各時刻スライスの縦方向でドラッグ（brushY）→ その範囲に重なるコミュニティ（サンキーのノード）を選択。選択結果は Zustand の selectedCommunities に反映。


選択ルール

* ブロック（コミュニティ）矩形の 縦区間 [y0, y1] とブラシの区間 [b0, b1] が一定割合以上重なればヒット。
* 既定：重なり面積率 ≥ 0.5（ブロックの高さに対する比率）
* 代替：ブロック中心 yc ∈ [b0, b1] でもOK


UIふるまい

* ブラシ中は該当ブロックを強調（不透明度↑・ストローク）、非該当はフェード。
* ブラシ確定（end）で Zustand に確定反映。
* クリアボタンでスライスの選択解除。
* スライスごとに独立した brushY を設置（横方向の干渉なし）。




### 4.3 Graph（Sigma.js）

* 入力：
  * 現在の `time`（スライダーの単一点または timeRange の右端）
  * ノードCSV/エッジCSVのURL（初期は静的）
* 描画：
  * ノード属性：`{ x:number, y:number, size:number, color:string, cluster:string, label?:string }`
  * エッジ属性： なし(全て薄い灰色)
* 色分け：
  * `cluster → color` のマップ（Configで定義。未定義はパレットから自動割当）
* 連動：

  * `selectedCommunities` が空→全体を彩色
  * 非空→該当クラスタは強色、非該当は薄灰（必要なら `hidden` で非表示）
* インタラクション：
  * ノードhover：ツールチップ表示（cluster_name）
  * クリック：ノード固定ハイライト（任意で `highlightedNodeIds` に反映）
* パフォーマンス：
  * 初回ロード後は 差分更新（`setNodeAttribute`, `setEdgeAttribute`）
  * Labelは初期OFF、ズームインでON（LOD）
  * フィルタ適用時は `hidden` 属性を使用

---

## 5. UI要件

### 5.1 画面構成

* 左：Alluvialビュー（範囲選択・クリック）
* 右：グラフビュー（Sigma）
* 上：時刻スライダー（単一点 or ステップ）
* 下：凡例（cluster → color）、選択クリア、検索ボックス（ノードID/ラベル）

### 5.2 操作フロー

1. ユーザーがAlluvialで範囲をドラッグ（ブラッシング）
2. Zustandの `timeRange` 更新
3. グラフビューは `timeRange` の右端（=現時点）を描画対象に切替
   （将来的に「時系列再生」を追加）
4. Alluvialでコミュニティの帯/ノードをクリック → `selectedCommunities` 更新
5. グラフが該当クラスタを強調表示（他はフェード/非表示）


---

## 非機能要件

- 拡張性: `GraphAdapter` 抽象化（将来 Cytoscape/G6 に差替可能）



## エラーハンドリング

* データ取得失敗：リトライ＋ユーザー通知（トースト）
* 空データ：プレースホルダ表示（「該当データなし」）



## 運用

* CORS：フロントのオリジンを許可
* データは読み取り専用エンドポイント
* デプロイ：FastAPI(Uvicorn/Gunicorn) + Next.js（Vercel or Node/NGINX）



## 将来拡張（設計上の前提）

* **Edge bundling**：

  * 段階1：バックエンドで“集約エッジ”を生成して描画（Sigma上は通常エッジ）
  * 段階2：`GraphAdapter` を **Cytoscape.js + edge-bundling拡張**へ差替
* **時系列再生**：timeスライダーのアニメーション再生（1–5fps、差分更新のみ）
* **検索・ピン留め**：ノードID/ラベル検索、ピン留めで常時強調



## 12. 実装メモ（抜粋）

### 12.1 Sigma ノード生成（固定座標・色分け）

```ts
graph.addNode(row.node_id, {
  x: +row.x,
  y: +row.y,
  size: 3,
  cluster: row.cluster,
  label: row.label || row.node_id,
  color: clusterColor(row.cluster), // 事前定義のマップ/パレット
});
```

### 12.2 クラスタ選択時の反映

```ts
const selected = useVizStore.getState().selectedCommunities;
graph.forEachNode((id, a) => {
  const hit = selected.size === 0 || selected.has(a.cluster);
  graph.setNodeAttribute(id, "hidden", selected.size > 0 && !hit);
});
graph.forEachEdge((e, a, s, t) => {
  const show = !graph.getNodeAttribute(s, "hidden") && !graph.getNodeAttribute(t, "hidden");
  graph.setEdgeAttribute(e, "hidden", !show);
});
```

### 12.3 Alluvialイベント

```ts
// ブラッシング
onBrush(([t0, t1]) => setBrush([t0, t1]));

// コミュニティクリック
onCommunityClick((cid) => toggleCommunity(cid));
```

## 引用

Alluvial Viewsの可視化アルゴリズムは以下の論文の内容を参照

Vehlow, Corinna, et al. "Visualizing the evolution of communities in dynamic graphs." Computer graphics forum. Vol. 34. No. 1. 2015.
