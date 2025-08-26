import { create } from 'zustand';
import {
    VizConfig,
    DynamicCommunity,
    CommunityBlock,
    TransitionCurve,
    LayoutOrdering,
    TransitionRank,
    VertexStability,
    Timestamp,
    CommunityId,
    NodeId
} from '../types';
import { dynamicCommunityApi } from '../lib/dynamicCommunityApi';

interface DynamicCommunityState {
    // 設定
    config: VizConfig;

    // データ
    timestamps: Timestamp[];
    dynamicCommunities: DynamicCommunity[];
    communityBlocks: CommunityBlock[];
    transitionCurves: TransitionCurve[];
    layoutOrdering: LayoutOrdering | null;
    transitionRank: TransitionRank | null;
    vertexStabilities: VertexStability[];

    // UI状態
    selectedNodeId: NodeId | null;
    selectedCommunityId: CommunityId | null;
    selectedTimestamp: Timestamp | null;

    // 計算状態
    isCalculating: boolean;
    calculationProgress: number;

    // データ取得状態
    isLoading: boolean;
    error: string | null;
    lastUpdated: Date | null;

    // アクション
    setConfig: (config: Partial<VizConfig>) => void;
    setTimestamps: (timestamps: Timestamp[]) => void;
    setDynamicCommunities: (communities: DynamicCommunity[]) => void;
    setCommunityBlocks: (blocks: CommunityBlock[]) => void;
    setTransitionCurves: (curves: TransitionCurve[]) => void;
    setLayoutOrdering: (ordering: LayoutOrdering) => void;
    setTransitionRank: (rank: TransitionRank) => void;
    setVertexStabilities: (stabilities: VertexStability[]) => void;

    setSelectedNode: (nodeId: NodeId | null) => void;
    setSelectedCommunity: (communityId: CommunityId | null) => void;
    setSelectedTimestamp: (timestamp: Timestamp | null) => void;

    setCalculating: (isCalculating: boolean) => void;
    setCalculationProgress: (progress: number) => void;

    // データ取得
    fetchData: () => Promise<void>;
    refreshData: () => Promise<void>;
    clearError: () => void;

    // 計算トリガー
    recalculateLayout: () => void;
    recalculateTracking: () => void;
    recalculateColoring: () => void;
}

const defaultConfig: VizConfig = {
    theta: 0.5,
    colorMode: 'dynamic',
    edgeThreshold: { intra: 0.1, inter: 0.3 },
    nodeHeight: 6,
    gaps: { node: 1, community: 8 },
    drawOrderPolicy: 'groupsFirst'
};

export const useDynamicCommunityStore = create<DynamicCommunityState>((set, get) => ({
    // 初期状態
    config: defaultConfig,
    timestamps: [],
    dynamicCommunities: [],
    communityBlocks: [],
    transitionCurves: [],
    layoutOrdering: null,
    transitionRank: null,
    vertexStabilities: [],
    selectedNodeId: null,
    selectedCommunityId: null,
    selectedTimestamp: null,
    isCalculating: false,
    calculationProgress: 0,
    isLoading: false,
    error: null,
    lastUpdated: null,

    // アクション
    setConfig: (config) => set((state) => ({
        config: { ...state.config, ...config }
    })),

    setTimestamps: (timestamps) => set({ timestamps }),
    setDynamicCommunities: (communities) => set({ dynamicCommunities: communities }),
    setCommunityBlocks: (blocks) => set({ communityBlocks: blocks }),
    setTransitionCurves: (curves) => set({ transitionCurves: curves }),
    setLayoutOrdering: (ordering) => set({ layoutOrdering: ordering }),
    setTransitionRank: (rank) => set({ transitionRank: rank }),
    setVertexStabilities: (stabilities) => set({ vertexStabilities: stabilities }),

    setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),
    setSelectedCommunity: (communityId) => set({ selectedCommunityId: communityId }),
    setSelectedTimestamp: (timestamp) => set({ selectedTimestamp: timestamp }),

    setCalculating: (isCalculating) => set({ isCalculating }),
    setCalculationProgress: (progress) => set({ calculationProgress: progress }),

    // データ取得
    fetchData: async () => {
        const state = get();
        if (state.isLoading) return;

        set({ isLoading: true, error: null });

        try {
            const data = await dynamicCommunityApi.fetchProcessedData();

            set({
                timestamps: data.timestamps,
                communityBlocks: data.communityBlocks,
                transitionCurves: data.transitionCurves,
                dynamicCommunities: data.dynamicCommunities,
                vertexStabilities: data.vertexStabilities,
                isLoading: false,
                lastUpdated: new Date(),
                error: null
            });
        } catch (error) {
            console.error('Error fetching data:', error);
            set({
                isLoading: false,
                error: error instanceof Error ? error.message : 'データの取得に失敗しました'
            });
        }
    },

    refreshData: async () => {
        const state = get();
        if (state.isLoading) return;

        await state.fetchData();
    },

    clearError: () => set({ error: null }),

    // 計算トリガー（実装は後で追加）
    recalculateLayout: () => {
        const state = get();
        set({ isCalculating: true, calculationProgress: 0 });
        // TODO: 交差最小化アルゴリズムの実装
        setTimeout(() => {
            set({ isCalculating: false, calculationProgress: 100 });
        }, 1000);
    },

    recalculateTracking: () => {
        const state = get();
        set({ isCalculating: true, calculationProgress: 0 });
        // TODO: コミュニティ追跡アルゴリズムの実装
        setTimeout(() => {
            set({ isCalculating: false, calculationProgress: 100 });
        }, 1000);
    },

    recalculateColoring: () => {
        const state = get();
        set({ isCalculating: true, calculationProgress: 0 });
        // TODO: 色割り当て最適化の実装
        setTimeout(() => {
            set({ isCalculating: false, calculationProgress: 100 });
        }, 1000);
    }
}));
