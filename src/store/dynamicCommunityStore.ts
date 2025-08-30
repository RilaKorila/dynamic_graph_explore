import { create } from 'zustand';
import {
    DynamicCommunity,
    CommunityBlock,
    TransitionCurve,
    VertexStability,
    Timestamp,
    CommunityId,
    NodeId
} from '../types';
import { dynamicCommunityApi } from '../lib/dynamicCommunityApi';

interface DynamicCommunityState {
    // データ
    timestamps: Timestamp[];
    dynamicCommunities: DynamicCommunity[];
    communityBlocks: CommunityBlock[];
    transitionCurves: TransitionCurve[];
    vertexStabilities: VertexStability[];

    // UI状態
    selectedNodeId: NodeId | null;
    selectedCommunityId: CommunityId | null;

    // 計算状態
    isCalculating: boolean;
    calculationProgress: number;

    // データ取得状態
    isLoading: boolean;
    error: string | null;

    // データ取得
    fetchData: () => Promise<void>;
    refreshData: () => Promise<void>;
    clearError: () => void;
}

export const useDynamicCommunityStore = create<DynamicCommunityState>((set, get) => ({
    // 初期状態
    timestamps: [],
    dynamicCommunities: [],
    communityBlocks: [],
    transitionCurves: [],
    vertexStabilities: [],
    selectedNodeId: null,
    selectedCommunityId: null,
    isCalculating: false,
    calculationProgress: 0,
    isLoading: false,
    error: null,

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
}));
