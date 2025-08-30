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



## 要件② Community 間の並び順

## 目的

* 隣接時刻間のリボン交差を最小化しつつ、時間方向に並びが大きく変動しない安定性を保つ。

## 入力

* 離散時刻集合 $T=\{t_1,\dots,t_m\}$
* 各時刻のコミュニティ分割 $P_t=\{C_{t,1},\dots\}$（各 $C$ のメンバー集合が与えられる）
* 参照時刻間の対応評価に用いる**類似度**（既定：Jaccard）および**共有ノード数**

## 出力

* 各時刻 $t$ の**コミュニティ順序** `commOrder[t]: CommunityId[]`
* 付帯メトリクス：`crossingsTotal`（交差数合計）、`stabilityCost`（順序変動コスト）

## 最適化の目的関数

* 主目的：隣接時刻 $(t, t+1)$ 間の**交差数**の総和を最小化
* 副目的：**安定性コスト**（順序インデックスの変化量の総和）を抑制
* 評価関数（要件レベル）：
  `score = crossingsTotal + λ * stabilityCost` （λ は非負の重み、デフォルト小さめ）

## 並び替えの一貫基準

* 各時刻 $t$ のコミュニティ位置は、隣接時刻側の**バリセンタ**（参照側のコミュニティ位置の重み付き平均）に基づく**安定ソート**で決定すること

  * 重みは**共有ノード数**（必須）
  * 参照側コミュニティが存在しない場合はゼロ重み扱い（末尾寄せ）または既定位置

## スイープ要件

* **左右往復スイープ**（$t_1\rightarrow t_m$ と $t_m\rightarrow t_1$）を交互に行い、改善が頭打ちになるまで繰り返す
* 反復上限・早期打ち切り基準（改善なし連続 N 回など）を持つこと

## 初期順序の要件

* 少なくとも1つは決定的初期順序（例：サイズ降順）を採用
* 推奨：複数初期順序（ランダム／サイズ基準など）からの**再スタート**を許容し、最良スコアを採択

## タイブレーク（決定性担保）

* ①直前反復の順序（安定性優先）
* ②コミュニティサイズ（大→小 または小→大のいずれかを固定）
* ③CommunityId の辞書順
* 上記規則で**安定ソート**を用い、結果の決定性を保証

## パラメータ

* `λ`（安定性重み）：既定は小（例 0.05）。0 で純交差最小化
* `sweepsMax`：往復スイープの上限回数（例 10–20）
* `restarts`：初期順序の試行回数（例 3–5）

## 付随要件

* communityLabel, drawTransitionCurvesで描画される曲線も、communityの位置入れ替えと連動して位置が必ず変わること

## エッジケース要件

* **出現コミュニティ**（新設）：参照側に対応がなければ末尾もしくは近縁（類似度高）ブロック近傍に配置（規則を固定）
* **消滅コミュニティ**：次時刻では無視（評価は現時刻まで）
* **同率バリセンタ**：必ずタイブレーク規則に従い決定的に並べる


## 受け入れ基準

1. 単純な「ID順」より**交差数が非増加**であること
2. `λ>0` で、連続時刻のコミュニティ順位変動（位置の入れ替え）が**明確に減少**すること
3. 初期順序を変えても、最終的に**最小スコア**の順序が選ばれること
4. 出現/消滅が混在するケースでも**決定的な順序**が得られること


# 追加要件 — 動的コミュニティ配色（Dynamic Community Coloring）

## 目的
- 同じ動的コミュニティ系列に属するコミュニティ（時刻が違っても）を同一色で表示し、時間方向の追跡を容易にする。
- 既存実装が使っている時刻別コミュニティIDから、動的コミュニティIDを導出し、色を DynamicCommunityId に紐づける。
- Alluvial Viewだけでなく、Graph Viewの色も反映させたいので、DynamicCommunityIdと色情報の出しわけや各コンポーネントでの利用はcolors.tsに持たせること
- dynamic_community_idに関する部分は、process_datasetsでデータ処理をしているので、できるだけそこで処理して、csvファイルに情報を格納すること

## 入力
- 離散時刻集合 \(T\)、各時刻のコミュニティ分割 \(P_t\)。
- 時刻間のコミュニティ対応を得るための類似度指標（Jaccard）としきい値 \(\theta\)。
- 現状の描画要素：`CommunityBlock{ t, communityId, ... }`。

## 必須要件
1. **動的コミュニティ推定**
   - 隣接時刻でコミュニティ間類似度を計算し、\(\theta\) 以上を系列に連結。
   - スプリット/マージ、ギャップも処理可能にする。

2. **配色スキームの主原則**
   - 色は DynamicCommunityId に一意割当。

3. **色の割当方針**
   - 異なる DynamicCommunityId 同士で十分に区別可能にする。
   - 類似系列は近い色相／近接系列は遠い色相など、モード切替で制御可能。

4. **安定表示**
   - \(\theta\) の変更や再計算後も既存 DynamicCommunityId の色は保持する。
   - 新規系列のみ未使用色を割当。

5. **凡例・説明可能性**
   - DynamicCommunityId 一覧を色チップ付きで提示可能。
   - ブロック選択で系列全体をハイライト可能。

## エッジケース
- **スプリット/マージ**: 主系列を優先し、派生は別 DynamicCommunityId。  



## 引用

Alluvial Viewsの可視化アルゴリズムは以下の論文の内容を参照

Vehlow, Corinna, et al. "Visualizing the evolution of communities in dynamic graphs." Computer graphics forum. Vol. 34. No. 1. 2015.
