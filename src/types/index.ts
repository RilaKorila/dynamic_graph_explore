// ノードデータの型定義
export interface Node {
    node_id: string
    x: number
    y: number
    time: string
    cluster: string
    label: string
    dynamic_community_id: string
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
    dynamic_community_id: string
}

// 描画用の型定義
export type AlluvialBlock = AlluvialNode & {
    y0: number
    y1: number
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

// コミュニティ情報の型定義
export interface CommunityInfo {
    id: string
    time: string
    size: number
    label: string
    color: string
    dynamic_community_id?: string
}

// 動的コミュニティ可視化用の型定義（仕様書準拠）
export type NodeId = string;
export type CommunityId = string;
export type Timestamp = string; // ISO 8601 (per slice)

export interface NodeMeta {
    id: NodeId;
    label?: string;
}

export interface TimedEdge {
    t: Timestamp;
    source: NodeId;
    target: NodeId;
    w?: number;
}

export interface TimedMembership {
    t: Timestamp;
    node: NodeId;
    community: CommunityId;
}

export interface Partition {
    t: Timestamp;
    communities: Record<CommunityId, NodeId[]>;
}

export interface DynamicCommunity {
    id: string; // D1, D2, ...
    timeline: Array<{ t: Timestamp; community?: CommunityId }>; // gaps allowed
    stability?: number; // computed
    color?: string; // assigned hue
}

export interface VertexStability {
    node: NodeId;
    stability: number;
}

export interface CommunityBlock {
    t: Timestamp;
    communityId: CommunityId;
    y0: number;
    y1: number;
    nodes: NodeId[];
    density: number; // 相対密度 ρ
    stability: number; // コミュニティ安定性
    label: string;
    dynamicCommunityId?: string;
}

export interface TransitionCurve {
    source: { t: Timestamp; y: number; community: CommunityId };
    target: { t: Timestamp; y: number; community: CommunityId };
    nodes: NodeId[];
    weight: number;
    dynamicCommunityId: string;
}
