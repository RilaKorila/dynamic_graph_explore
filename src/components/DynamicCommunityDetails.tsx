'use client';

import React from 'react';
import { useDynamicCommunityStore } from '../store/dynamicCommunityStore';
import {
    CommunityBlock,
    TransitionCurve,
    VertexStability
} from '../types';
import { Info, Users, TrendingUp, Activity, Calendar, Hash } from 'lucide-react';

export const DynamicCommunityDetails: React.FC = () => {
    const {
        selectedNodeId,
        selectedCommunityId,
        selectedTimestamp,
        hoveredElement,
        communityBlocks,
        transitionCurves,
        dynamicCommunities,
        vertexStabilities,
        config
    } = useDynamicCommunityStore();

    // 選択されたコミュニティの情報
    const selectedCommunity = selectedCommunityId
        ? communityBlocks.find(b => b.communityId === selectedCommunityId)
        : null;

    // 選択されたノードの情報
    const selectedNodeStability = selectedNodeId
        ? vertexStabilities.find(v => v.node === selectedNodeId)
        : null;

    // ホバーされた要素の情報
    const hoveredCommunity = hoveredElement?.type === 'community'
        ? communityBlocks.find(b => b.communityId === hoveredElement.id)
        : null;

    const hoveredCurve = hoveredElement?.type === 'curve'
        ? transitionCurves.find(c =>
            `${c.source.t}-${c.source.community}-${c.target.t}-${c.target.community}` === hoveredElement.id
        )
        : null;

    // 表示する情報の決定（選択 > ホバー > デフォルト）
    const displayInfo = selectedCommunity || hoveredCommunity ||
        selectedNodeStability || hoveredCurve || null;

    if (!displayInfo) {
        return (
            <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center space-x-2 text-lg font-semibold text-gray-800 mb-4">
                    <Info className="w-5 h-5" />
                    <span>詳細情報</span>
                </div>
                <div className="text-gray-500 text-center py-8">
                    要素を選択またはホバーして詳細情報を表示
                </div>
            </div>
        );
    }

    // コミュニティ情報の表示
    if ('communityId' in displayInfo) {
        const community = displayInfo as CommunityBlock;
        const dynamicCommunity = dynamicCommunities.find(dc =>
            dc.timeline.some(t => t.community === community.communityId)
        );

        return (
            <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
                <div className="flex items-center space-x-2 text-lg font-semibold text-gray-800">
                    <Users className="w-5 h-5" />
                    <span>コミュニティ詳細</span>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                        <Hash className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">ID:</span>
                        <span className="text-sm text-gray-900">{community.communityId}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">時刻:</span>
                        <span className="text-sm text-gray-900">{community.t}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">サイズ:</span>
                        <span className="text-sm text-gray-900">{community.nodes.length} ノード</span>
                    </div>

                    <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">相対密度:</span>
                        <span className="text-sm text-gray-900">{community.density.toFixed(3)}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Activity className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">安定性:</span>
                        <span className="text-sm text-gray-900">{community.stability.toFixed(3)}</span>
                    </div>

                    {dynamicCommunity && (
                        <div className="pt-3 border-t border-gray-200">
                            <div className="flex items-center space-x-2 mb-2">
                                <TrendingUp className="w-4 h-4 text-blue-500" />
                                <span className="text-sm font-medium text-blue-700">動的コミュニティ</span>
                            </div>
                            <div className="text-sm text-gray-700">
                                <div>ID: {dynamicCommunity.id}</div>
                                <div>安定性: {dynamicCommunity.stability?.toFixed(3) || 'N/A'}</div>
                                <div>タイムライン: {dynamicCommunity.timeline.length} 時刻</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // 頂点安定性情報の表示
    if ('node' in displayInfo) {
        const nodeStability = displayInfo as VertexStability;

        return (
            <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
                <div className="flex items-center space-x-2 text-lg font-semibold text-gray-800">
                    <Activity className="w-5 h-5" />
                    <span>ノード詳細</span>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                        <Hash className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">ノードID:</span>
                        <span className="text-sm text-gray-900">{nodeStability.node}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">安定性:</span>
                        <span className="text-sm text-gray-900">{nodeStability.stability.toFixed(3)}</span>
                    </div>

                    <div className="pt-3 border-t border-gray-200">
                        <div className="text-sm text-gray-600">
                            このノードのコミュニティ所属履歴に対する安定性指標です。
                            値が高いほど、一貫したコミュニティに所属していることを示します。
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 遷移曲線情報の表示
    if ('source' in displayInfo) {
        const curve = displayInfo as TransitionCurve;

        return (
            <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
                <div className="flex items-center space-x-2 text-lg font-semibold text-gray-800">
                    <TrendingUp className="w-5 h-5" />
                    <span>遷移詳細</span>
                </div>

                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-xs font-medium text-gray-500 mb-1">開始時刻</div>
                            <div className="text-sm text-gray-900">{curve.source.t}</div>
                            <div className="text-xs text-gray-600">コミュニティ: {curve.source.community}</div>
                        </div>
                        <div>
                            <div className="text-xs font-medium text-gray-500 mb-1">終了時刻</div>
                            <div className="text-sm text-gray-900">{curve.target.t}</div>
                            <div className="text-xs text-gray-600">コミュニティ: {curve.target.community}</div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">ノード数:</span>
                        <span className="text-sm text-gray-900">{curve.nodes.length}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">重み:</span>
                        <span className="text-sm text-gray-900">{curve.weight.toFixed(3)}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Hash className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">描画順位:</span>
                        <span className="text-sm text-gray-900">{curve.rank}</span>
                    </div>

                    <div className="pt-3 border-t border-gray-200">
                        <div className="text-sm text-gray-600">
                            動的コミュニティ: {curve.dynamicCommunityId}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};
