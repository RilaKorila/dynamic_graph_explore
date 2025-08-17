'use client';

import React, { useEffect } from 'react';
import { DynamicCommunityCanvas } from '../../components/DynamicCommunityCanvas';
import { DynamicCommunityControls } from '../../components/DynamicCommunityControls';
import { DynamicCommunityDetails } from '../../components/DynamicCommunityDetails';
import { useDynamicCommunityStore } from '../../store/dynamicCommunityStore';
import {
    Timestamp,
    CommunityId,
    NodeId,
    CommunityBlock,
    TransitionCurve,
    DynamicCommunity,
    VertexStability
} from '../../types';

export default function DynamicCommunitiesPage() {
    const {
        timestamps,
        communityBlocks,
        transitionCurves,
        dynamicCommunities,
        vertexStabilities,
        isLoading,
        error,
        lastUpdated,
        fetchData
    } = useDynamicCommunityStore();

    // 初回データ取得
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // データ統計
    const dataStats = {
        timestamps: timestamps.length,
        communities: communityBlocks.length,
        transitions: transitionCurves.length,
        dynamicCommunities: dynamicCommunities.length,
        nodes: vertexStabilities.length
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-8">
                {/* ヘッダー */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        動的コミュニティ可視化
                    </h1>
                    <p className="text-gray-600">
                        CSVデータに基づくコミュニティ進化の可視化
                    </p>
                </div>

                {/* ローディング状態 */}
                {isLoading && (
                    <div className="mb-8 bg-white rounded-lg shadow-lg p-6">
                        <div className="flex items-center justify-center space-x-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="text-lg text-gray-700">データを取得中...</span>
                        </div>
                    </div>
                )}

                {/* メインコンテンツ */}
                {!isLoading && !error && (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* 左サイドバー - コントロールとデータ情報 */}
                        <div className="lg:col-span-1 space-y-6">
                            <DynamicCommunityControls />

                            {/* データ情報 */}
                            <div className="bg-white rounded-lg shadow-lg p-6">
                                <h2 className="text-lg font-semibold text-gray-800 mb-4">データ概要</h2>
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="font-medium text-gray-700 mb-2">時刻情報</h3>
                                        <div className="text-sm text-gray-600">
                                            <div>• データポイント: {dataStats.timestamps}</div>
                                            <div>• 期間: {timestamps.length > 0 ? `${timestamps[0]} - ${timestamps[timestamps.length - 1]}` : 'N/A'}</div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-700 mb-2">コミュニティ情報</h3>
                                        <div className="text-sm text-gray-600">
                                            <div>• 総ブロック数: {dataStats.communities}</div>
                                            <div>• 動的コミュニティ: {dataStats.dynamicCommunities}</div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-700 mb-2">遷移情報</h3>
                                        <div className="text-sm text-gray-600">
                                            <div>• 遷移曲線: {dataStats.transitions}</div>
                                            <div>• 平均重み: {transitionCurves.length > 0 ?
                                                (transitionCurves.reduce((sum, c) => sum + c.weight, 0) / transitionCurves.length).toFixed(2) : 'N/A'}</div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-700 mb-2">ノード情報</h3>
                                        <div className="text-sm text-gray-600">
                                            <div>• 総ノード数: {dataStats.nodes}</div>
                                            <div>• 平均安定性: {vertexStabilities.length > 0 ?
                                                (vertexStabilities.reduce((sum, v) => sum + v.stability, 0) / vertexStabilities.length).toFixed(3) : 'N/A'}</div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-700 mb-2">データソース</h3>
                                        <div className="text-sm text-gray-600">
                                            <div>• ノード: processed/nodes.csv</div>
                                            <div>• エッジ: processed/edges.csv</div>
                                            <div>• コミュニティ: processed/alluvial_nodes.csv</div>
                                            {lastUpdated && (
                                                <div className="mt-2 text-xs text-gray-500">
                                                    最終更新: {lastUpdated.toLocaleString('ja-JP')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* メインキャンバス */}
                        <div className="lg:col-span-3">
                            <div className="bg-white rounded-lg shadow-lg p-4">
                                <div className="h-[800px]">
                                    <DynamicCommunityCanvas />
                                </div>
                            </div>

                            {/* 詳細情報パネル */}
                            <div className="mt-6">
                                <DynamicCommunityDetails />
                            </div>
                        </div>
                    </div>
                )}

                {/* データが空の場合の案内 */}
                {!isLoading && !error && timestamps.length === 0 && (
                    <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                        <div className="flex items-center space-x-3">
                            <div className="text-yellow-600 text-xl">ℹ️</div>
                            <div>
                                <h3 className="text-lg font-semibold text-yellow-800">データがありません</h3>
                                <p className="text-yellow-700">
                                    バックエンドからデータを取得できませんでした。左側のコントロールパネルから「データ取得」ボタンを押してデータを読み込んでください。
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
