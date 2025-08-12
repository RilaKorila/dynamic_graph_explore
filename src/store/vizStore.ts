import { create } from 'zustand'

export interface VizState {
    // 時間範囲（例: ["2021Q1","2021Q3"]）
    timeRange: [string, string]
    // Alluvialで選ばれた community/cluster
    selectedCommunities: Set<string>
    // 任意（ノード検索等）
    highlightedNodeIds: Set<string>
    // 現在の時刻（スライダーの単一点）
    currentTime: string
}

interface VizActions {
    // ブラッシングで時間範囲を更新
    setBrush: (range: [string, string]) => void
    // コミュニティの選択/選択解除
    toggleCommunity: (id: string) => void
    // 選択をクリア
    clearSelection: () => void
    // 現在の時刻を設定
    setCurrentTime: (time: string) => void
    // ノードのハイライト
    toggleHighlightedNode: (id: string) => void
    // ハイライトをクリア
    clearHighlightedNodes: () => void
}

export const useVizStore = create<VizState & VizActions>((set, get) => ({
    // 初期状態
    timeRange: ['2021Q1', '2021Q3'],
    selectedCommunities: new Set(),
    highlightedNodeIds: new Set(),
    currentTime: '2021Q3',

    // アクション
    setBrush: (range: [string, string]) => {
        set({ timeRange: range })
    },

    toggleCommunity: (id: string) => {
        const { selectedCommunities } = get()
        const newSelected = new Set(selectedCommunities)

        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }

        set({ selectedCommunities: newSelected })
    },

    clearSelection: () => {
        set({ selectedCommunities: new Set() })
    },

    setCurrentTime: (time: string) => {
        set({ currentTime: time })
    },

    toggleHighlightedNode: (id: string) => {
        const { highlightedNodeIds } = get()
        const newHighlighted = new Set(highlightedNodeIds)

        if (newHighlighted.has(id)) {
            newHighlighted.delete(id)
        } else {
            newHighlighted.add(id)
        }

        set({ highlightedNodeIds: newHighlighted })
    },

    clearHighlightedNodes: () => {
        set({ highlightedNodeIds: new Set() })
    },
}))
