# Dynamic Graph Explorer

動的グラフにおけるコミュニティ進化の可視化プログラム

## 概要

このプロジェクトは、時系列で変化するグラフデータにおけるコミュニティの進化パターン（分裂、統合、維持、消滅）を可視化するWebアプリケーションです。Alluvial View（コミュニティ遷移図）とGraph View（ネットワーク図）を連動させて表示し、動的コミュニティの追跡を可能にします。

## 主な機能

### 1. 動的コミュニティ可視化
- **Alluvial View**: 時系列でのコミュニティ遷移を曲線で表現
- **Graph View**: 各時刻のネットワーク構造を可視化
- **連動表示**: 時刻スライダーで両ビューを同期

### 2. コミュニティ追跡アルゴリズム
- **Jaccard類似度**: コミュニティ間の類似性計算
- **動的コミュニティID**: 時系列でのコミュニティ系列を自動追跡
- **遷移パターン検知**: 分裂・統合・維持・消滅の自動識別

### 3. インタラクティブ機能
- **時刻選択**: スライダーで任意の時刻範囲を選択
- **コミュニティフィルタリング**: 特定のコミュニティのみを表示
- **フルスクリーン表示**: 個別グラフの詳細表示
- **色分け表示**: 動的コミュニティIDに基づく一貫した配色

## アーキテクチャ

### バックエンド（FastAPI）
- **データ配信**: CSV形式でのグラフデータ提供
- **データ処理**: 動的コミュニティの自動検出とID割り当て
- **API エンドポイント**:
  - `GET /data/nodes` - ノードデータ
  - `GET /data/edges` - エッジデータ
  - `GET /data/alluvial-nodes` - コミュニティデータ
  - `GET /data/alluvial-links` - 遷移データ

### フロントエンド（Next.js + TypeScript）
- **状態管理**: Zustand（設定、データ、UI状態）
- **可視化**: D3.js + Canvas API（Alluvial View）、Sigma.js（Graph View）
- **UI**: Tailwind CSS 4.x [[memory:6269471]]

## データ構造

### ノードデータ
```csv
node_id,x,y,time,cluster,label,dynamic_community_id
1,12.34,-7.89,1993,C3,Alice,D1
```

### エッジデータ
```csv
src,dst,time
1,2,1993
```

### コミュニティデータ
```csv
time,community_id,size,label,dynamic_community_id
1993,C14_1993,27,C14,D1
```

## 技術スタック

### バックエンド
- **Python 3.8+**
- **FastAPI**: Webフレームワーク
- **Uvicorn**: ASGIサーバー

### フロントエンド
- **Next.js 14**: Reactフレームワーク
- **TypeScript**: 型安全性
- **Zustand**: 状態管理
- **D3.js**: データ可視化（Alluvial View）
- **Sigma.js**: グラフ可視化（Graph View）
- **Canvas API**: 高性能描画
- **Tailwind CSS 4.x**: スタイリング

### データ処理
- **Jaccard類似度**: コミュニティ類似性計算
- **CSV解析**: データ読み込み・変換

## セットアップ・実行方法

### 1. バックエンド起動
```bash
python backend/run.py
```
バックエンドは `http://localhost:8000` で起動します。

### 2. フロントエンド起動
```bash
npm install
npm run dev
```
フロントエンドは `http://localhost:3000` で起動します。

### 3. アプリケーション利用
1. ブラウザで `http://localhost:3000` にアクセス
2. 時刻スライダーで表示する時刻範囲を選択
3. Community Dynamics Viewでコミュニティ遷移を確認
4. Graph Viewでネットワーク構造を確認
5. 個別グラフをクリックしてフルスクリーン表示

## 利用可能なデータセット

### Cit-HepPh（高エネルギー物理学論文共著ネットワーク）
- **期間**: 1993-1996年
- **データ**: 論文共著関係の時系列ネットワーク

### NBAF_coauthors（共著者ネットワーク）
- **期間**: 1998-2013年
- **データ**: 研究者間の共著関係

## ページ構成

### メインページ (`/`)
- **時刻スライダー**: 表示時刻の選択
- **Community Dynamics View**: Alluvial可視化
- **Graph View**: 複数時刻のグラフ表示
- **Community Legend**: コミュニティ凡例

### フルスクリーングラフ (`/graph/[timestamp]`)
- **個別グラフ表示**: 指定時刻の詳細ネットワーク
- **Sigma.js**: インタラクティブなグラフ操作
- **ラベル非表示**: パフォーマンス最適化

## 主要コンポーネント

### DynamicCommunityCanvas
- Alluvial Viewの描画
- コミュニティブロックと遷移曲線の表示
- インタラクティブな選択・ハイライト機能

### MultiGraphChart
- 複数時刻のグラフを横スクロール表示
- 時刻選択に応じた自動スクロール
- SingleGraphChartの組み合わせ

### TimeSlider
- 時刻範囲の選択
- ブラシ操作による範囲指定
- 利用可能時刻の自動検出

### Legend
- コミュニティの色分け表示
- 時刻別のコミュニティ一覧
- 動的コミュニティIDに基づく配色

## 開発・カスタマイズ

### データ追加
1. `backend/data/` に新しいデータセットを配置
2. `backend/app/process_datasets.py` でデータ処理ロジックを調整
3. フロントエンドで自動的に新しいデータが利用可能

### 配色カスタマイズ
- `src/lib/colors.ts` で動的コミュニティの配色を調整
- 色の一貫性と区別性を保つ配色アルゴリズム

### 可視化パラメータ調整
- Jaccard類似度の閾値設定
- コミュニティサイズの最小値設定
- 遷移パターンの検知条件調整

## 引用

Alluvial Viewsの可視化アルゴリズムは以下の論文の内容を参照しています：

Vehlow, Corinna, et al. "Visualizing the evolution of communities in dynamic graphs." Computer graphics forum. Vol. 34. No. 1. 2015.
