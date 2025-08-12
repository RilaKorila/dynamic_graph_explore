// ノードデータの型定義
export interface Node {
    node_id: string
    x: number
    y: number
    time: string
    cluster: string
    label: string
}

// エッジデータの型定義
export interface Edge {
    src: string
    dst: string
    time: string
}

// Alluvialノードデータの型定義
export interface AlluvialNode {
    time: string
    community_id: string
    size: number
    label: string
}

// Alluvial遷移データの型定義
export interface AlluvialLink {
    time_from: string
    comm_id_from: string
    time_to: string
    comm_id_to: string
    weight: number
}

// コミュニティ情報の型定義
export interface Community {
    id: string
    name: string
    color: string
    size: number
}

// 時間範囲の型定義
export type TimeRange = [string, string]

// 選択状態の型定義
export interface SelectionState {
    selectedCommunities: Set<string>
    highlightedNodeIds: Set<string>
    timeRange: TimeRange
    currentTime: string
}
