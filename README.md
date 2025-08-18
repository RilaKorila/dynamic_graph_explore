# Dynamic Graph Explorer

動的グラフにおけるコミュニティ進化の可視化プログラム

## 0. 目的

* 動的グラフにおけるコミュニティの進化パターン（分裂、統合、維持、消滅）を可視化
* Alluvial（D3）上のコミュニティブロックと遷移曲線による時系列コミュニティ追跡
* コミュニティ間の類似度に基づく自動的な遷移検知
* バックエンドは FastAPI、フロントは Next.js + TypeScript + Zustand + D3

---

## 1. アーキテクチャ

* バックエンド：FastAPI(Python)
  * データ配信（CSV）、静的ファイル配信
  * コミュニティ進化パターンの検知・分析
* フロント：Next.js（React/TypeScript）
  * 動的コミュニティ可視化：D3.js + Canvas
  * 状態管理：Zustand（設定、データ、UI状態の単一ソース）
  * データ処理：Jaccard類似度によるコミュニティ追跡

---

## 2. データモデル（契約）

### 2.1 ノード（CSV）

`processed/nodes.csv`

```
node_id,x,y,time,cluster,label
1,12.34,-7.89,timestamp1,C3,Alice
```

* `x,y`：画面座標
* `time`：スナップショット識別子（例: timestamp1, timestamp2）
* `cluster`：クラスタID（色分けに使用）
* `label`：ノードラベル

### 2.2 エッジ（CSV）

`processed/edges.csv`

```
src,dst,time
1,2,timestamp1
```

### 2.3 Alluvialノード

`processed/alluvial_nodes.csv`

```
time,community_id,size,label
timestamp1,C14_timestamp1,27,C14
```

* `time`：時刻識別子
* `community_id`：コミュニティID
* `size`：コミュニティサイズ（ノード数）
* `label`：コミュニティラベル

---

## 3. API仕様（FastAPI）

### 3.1 静的配信

* `GET /data/nodes` → ノードデータ（CSV）
* `GET /data/edges` → エッジデータ（CSV）
* `GET /data/alluvial-nodes` → コミュニティデータ（CSV）
* `GET /health` → ヘルスチェック

### 3.2 データ構造

```json
{
  "nodes": [{"node_id":"1","x":12.3,"y":-7.8,"time":"timestamp1","cluster":"C3","label":"Alice"}],
  "edges": [{"src":"1","dst":"2","time":"timestamp1"}],
  "alluvialNodes": [{"time":"timestamp1","community_id":"C14_timestamp1","size":27,"label":"C14"}]
}
```

---

## 4. フロント仕様

### 4.1 Zustand ストア（動的コミュニティ）

```ts
type DynamicCommunityState = {
  // 設定
  config: VizConfig;
  
  // データ
  timestamps: Timestamp[];
  communityBlocks: CommunityBlock[];
  transitionCurves: TransitionCurve[];
  dynamicCommunities: DynamicCommunity[];
  vertexStabilities: VertexStability[];
  
  // UI状態
  selectedNodeId: NodeId | null;
  selectedCommunityId: CommunityId | null;
  hoveredElement: HoveredElement | null;
  
  // データ取得
  fetchData(): Promise<void>;
  refreshData(): Promise<void>;
};
```

### 4.2 動的コミュニティ可視化（D3 + Canvas）

#### 4.2.1 コミュニティブロック

* 各時刻のコミュニティを縦方向に配置
* 密度と安定性のインジケーター表示
* ノード数とラベルの表示

#### 4.2.2 遷移曲線

* 隣接時刻間のコミュニティ遷移を曲線で表現
* Jaccard類似度に基づく自動的な遷移検知
* 分裂パターン（点線）、統合パターンの視覚的区別

#### 4.2.3 遷移パターン検知

* **分裂パターン** 🟡：1つのコミュニティが複数に分裂
* **統合パターン** 🟣：複数のコミュニティが1つに統合
* **維持パターン** 🟢：1対1の安定した遷移
* **孤立** 🔴：遷移がないコミュニティ

### 4.3 設定パラメータ

```ts
type VizConfig = {
  theta: number;                  // 追跡しきい値 (0..0.9)
  colorMode: 'dynamic' | 'cStab' | 'vStab';  // 色分けモード
  edgeThreshold: { intra: number; inter: number };  // エッジ閾値
  nodeHeight: number;             // ノード高さ
  gaps: { node: number; community: number };  // 間隔設定
  drawOrderPolicy: 'groupsFirst' | 'groupsBack';  // 描画順序
};
```

---

## 5. 実装された機能

### 5.1 動的コミュニティ可視化

* **メインページ**: `/dynamic-communities`
* **レイアウト**: 縦長レイアウト（左：コントロール+データ概要、右：キャンバス+詳細情報）
* **キャンバス**: 800px高さの可視化エリア

### 5.2 コミュニティ追跡アルゴリズム

* **Jaccard類似度**: コミュニティ間の類似性計算
* **閾値設定**: 設定可能な類似度閾値（デフォルト: 0.1）
* **複数マッチング**: 1つのコミュニティから複数への遷移を検知

### 5.3 インタラクティブ機能

* **コミュニティ選択**: クリックでコミュニティ詳細表示
* **ホバー効果**: 遷移曲線のハイライト
* **詳細パネル**: 遷移パターン、統計情報の表示

---

## 6. UI要件

### 6.1 画面構成

* **左サイドバー**: コントロールパネル + データ概要
* **メインエリア**: 可視化キャンバス + 詳細情報パネル
* **コントロール**: 設定調整、データ取得、計算実行

### 6.2 操作フロー

1. データ取得ボタンでバックエンドからCSVデータを読み込み
2. 自動的にコミュニティ追跡と遷移パターンを検知
3. キャンバス上でコミュニティブロックと遷移曲線を表示
4. 設定パラメータの調整で可視化をカスタマイズ
5. 詳細パネルで遷移パターンと統計情報を確認

---

## 7. 技術スタック

### バックエンド
- **Python 3.8+**
- **FastAPI**: Webフレームワーク
- **Uvicorn**: ASGIサーバー

### フロントエンド
- **Next.js 14**: Reactフレームワーク
- **TypeScript**: 型安全性
- **Zustand**: 状態管理
- **D3.js**: データ可視化
- **Canvas API**: 高性能描画

### データ処理
- **Jaccard類似度**: コミュニティ類似性計算
- **CSV解析**: データ読み込み・変換

---

## 8. 開発・実行方法

### 8.1 バックエンド起動

```bash
cd backend
python run.py
```

### 8.2 フロントエンド起動

```bash
npm install
npm run dev
```

### 8.3 データ取得

1. ブラウザで `http://localhost:3000/dynamic-communities` にアクセス
2. 「データ取得」ボタンをクリック
3. バックエンドからCSVデータを自動取得・可視化

---

## 引用

Alluvial Viewsの可視化アルゴリズムは以下の論文の内容を参照

Vehlow, Corinna, et al. "Visualizing the evolution of communities in dynamic graphs." Computer graphics forum. Vol. 34. No. 1. 2015.
