'use client';

import React from 'react';
import { useDynamicCommunityStore } from '../store/dynamicCommunityStore';
import {
    CommunityBlock,
    TransitionCurve,
    VertexStability
} from '../types';
import { Info, Users, TrendingUp, Activity, Calendar, Hash, MapPin, Link as LinkIcon, Tag } from 'lucide-react';

export const DynamicCommunityDetails: React.FC = () => {
    const {
        selectedNodeId,
        selectedCommunityId,
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
                    <div className="mb-4">
                        <MapPin className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                    </div>
                    <p className="text-sm">要素を選択またはホバーして詳細情報を表示</p>
                    <p className="text-xs mt-2 text-gray-400">
                        コミュニティブロック、遷移曲線、ノードをクリックしてください
                    </p>
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

        // コミュニティの統計情報
        const nodeCount = community.nodes.length;
        const densityPercentage = (community.density * 100).toFixed(1);
        const stabilityPercentage = (community.stability * 100).toFixed(1);

        return (
            <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
                <div className="flex items-center space-x-2 text-lg font-semibold text-gray-800">
                    <Users className="w-5 h-5" />
                    <span>コミュニティ詳細</span>
                </div>

                <div className="space-y-4">
                    {/* 基本情報 */}
                    <div className="bg-gray-50 rounded-lg p-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center space-x-2">
                                <Hash className="w-4 h-4 text-gray-500" />
                                <span className="text-sm font-medium text-gray-700">ID:</span>
                                <span className="text-sm text-gray-900 font-mono">{community.communityId}</span>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <span className="text-sm font-medium text-gray-700">時刻:</span>
                                <span className="text-sm text-gray-900">{community.t}</span>
                            </div>

                            {community.label && community.label !== community.communityId && (
                                <div className="flex items-center space-x-2 col-span-2">
                                    <Tag className="w-4 h-4 text-gray-500" />
                                    <span className="text-sm font-medium text-gray-700">ラベル:</span>
                                    <span className="text-sm text-gray-900">{community.label}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 統計情報 */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="text-center bg-blue-50 rounded-lg p-3">
                            <div className="text-2xl font-bold text-blue-600">{nodeCount}</div>
                            <div className="text-xs text-blue-700">ノード数</div>
                        </div>
                        <div className="text-center bg-green-50 rounded-lg p-3">
                            <div className="text-2xl font-bold text-green-600">{densityPercentage}%</div>
                            <div className="text-xs text-green-700">相対密度</div>
                        </div>
                        <div className="text-center bg-purple-50 rounded-lg p-3">
                            <div className="text-2xl font-bold text-purple-600">{stabilityPercentage}%</div>
                            <div className="text-xs text-purple-700">安定性</div>
                        </div>
                    </div>

                    {/* ノードリスト */}
                    <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-2">
                            <Users className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">ノード一覧</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                            {community.nodes.slice(0, 9).map(nodeId => (
                                <div key={nodeId} className="text-xs bg-white px-2 py-1 rounded border text-center">
                                    {nodeId}
                                </div>
                            ))}
                            {community.nodes.length > 9 && (
                                <div className="text-xs bg-gray-200 px-2 py-1 rounded text-center text-gray-500">
                                    +{community.nodes.length - 9}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 動的コミュニティ情報 */}
                    {dynamicCommunity && (
                        <div className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-400">
                            <div className="flex items-center space-x-2 mb-2">
                                <TrendingUp className="w-4 h-4 text-blue-500" />
                                <span className="text-sm font-medium text-blue-700">動的コミュニティ</span>
                            </div>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">ID:</span>
                                    <span className="font-mono text-blue-900">{dynamicCommunity.id}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">安定性:</span>
                                    <span className="text-blue-900">
                                        {dynamicCommunity.stability ? (dynamicCommunity.stability * 100).toFixed(1) + '%' : 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">タイムライン:</span>
                                    <span className="text-blue-900">{dynamicCommunity.timeline.length} 時刻</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* コミュニティの特徴 */}
                    <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-sm text-gray-700">
                            <div className="mb-2">
                                <span className="font-medium">相対密度 ({densityPercentage}%):</span>
                                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${densityPercentage}%` }}
                                    />
                                </div>
                            </div>
                            <div>
                                <span className="font-medium">安定性 ({stabilityPercentage}%):</span>
                                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                    <div
                                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${stabilityPercentage}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 頂点安定性情報の表示
    if ('node' in displayInfo) {
        const nodeStability = displayInfo as VertexStability;
        const stabilityPercentage = (nodeStability.stability * 100).toFixed(1);

        return (
            <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
                <div className="flex items-center space-x-2 text-lg font-semibold text-gray-800">
                    <Activity className="w-5 h-5" />
                    <span>ノード詳細</span>
                </div>

                <div className="space-y-4">
                    {/* 基本情報 */}
                    <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                            <Hash className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">ノードID:</span>
                            <span className="text-sm text-gray-900 font-mono">{nodeStability.node}</span>
                        </div>
                    </div>

                    {/* 安定性指標 */}
                    <div className="bg-green-50 rounded-lg p-3 border-l-4 border-green-400">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-green-600 mb-2">{stabilityPercentage}%</div>
                            <div className="text-sm text-green-700 mb-3">安定性スコア</div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                                <div
                                    className="bg-green-600 h-3 rounded-full transition-all duration-300"
                                    style={{ width: `${stabilityPercentage}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 安定性の説明 */}
                    <div className="bg-blue-50 rounded-lg p-3">
                        <div className="text-sm text-blue-800">
                            <div className="font-medium mb-2">安定性の意味:</div>
                            <ul className="space-y-1 text-xs">
                                <li>• <strong>高安定性 (80-100%):</strong> 一貫したコミュニティに所属</li>
                                <li>• <strong>中安定性 (50-79%):</strong> 適度なコミュニティ移動</li>
                                <li>• <strong>低安定性 (0-49%):</strong> 頻繁なコミュニティ変更</li>
                            </ul>
                        </div>
                    </div>

                    {/* 技術的説明 */}
                    <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-600">
                            このノードのコミュニティ所属履歴に対する安定性指標です。
                            値が高いほど、一貫したコミュニティに所属していることを示します。
                            隣接時刻のJaccard類似度の平均値に基づいて計算されます。
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 遷移曲線情報の表示
    if ('source' in displayInfo) {
        const curve = displayInfo as TransitionCurve;
        const weightPercentage = (curve.weight / Math.max(...transitionCurves.map(c => c.weight)) * 100).toFixed(1);

        return (
            <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
                <div className="flex items-center space-x-2 text-lg font-semibold text-gray-800">
                    <LinkIcon className="w-5 h-5" />
                    <span>遷移詳細</span>
                </div>

                <div className="space-y-4">
                    {/* 遷移の概要 */}
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 border-l-4 border-blue-400">
                        <div className="text-center">
                            <div className="text-lg font-semibold text-gray-800 mb-1">
                                {curve.source.t} → {curve.target.t}
                            </div>
                            <div className="text-sm text-gray-600">
                                {curve.source.community} → {curve.target.community}
                            </div>
                        </div>
                    </div>

                    {/* 詳細情報 */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-xs font-medium text-gray-500 mb-1">開始時刻</div>
                            <div className="text-sm text-gray-900 font-semibold">{curve.source.t}</div>
                            <div className="text-xs text-gray-600">コミュニティ: {curve.source.community}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-xs font-medium text-gray-500 mb-1">終了時刻</div>
                            <div className="text-sm text-gray-900 font-semibold">{curve.target.t}</div>
                            <div className="text-xs text-gray-600">コミュニティ: {curve.target.community}</div>
                        </div>
                    </div>

                    {/* 統計情報 */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="text-center bg-blue-50 rounded-lg p-3">
                            <div className="text-2xl font-bold text-blue-600">{curve.nodes.length}</div>
                            <div className="text-xs text-blue-700">ノード数</div>
                        </div>
                        <div className="text-center bg-green-50 rounded-lg p-3">
                            <div className="text-2xl font-bold text-green-600">{curve.weight.toFixed(1)}</div>
                            <div className="text-xs text-green-700">重み</div>
                        </div>
                        <div className="text-center bg-purple-50 rounded-lg p-3">
                            <div className="text-2xl font-bold text-purple-600">{curve.rank}</div>
                            <div className="text-xs text-purple-700">描画順位</div>
                        </div>
                    </div>

                    {/* ノードリスト */}
                    <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-2">
                            <Users className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">遷移ノード</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                            {curve.nodes.slice(0, 12).map(nodeId => (
                                <div key={nodeId} className="text-xs bg-white px-2 py-1 rounded border text-center">
                                    {nodeId}
                                </div>
                            ))}
                            {curve.nodes.length > 12 && (
                                <div className="text-xs bg-gray-200 px-2 py-1 rounded text-center text-gray-500">
                                    +{curve.nodes.length - 12}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 重みの相対値 */}
                    <div className="bg-green-50 rounded-lg p-3">
                        <div className="text-sm text-green-800">
                            <div className="font-medium mb-2">重みの相対値: {weightPercentage}%</div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${weightPercentage}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 動的コミュニティ情報 */}
                    <div className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-400">
                        <div className="text-sm text-blue-800">
                            <div className="font-medium mb-1">動的コミュニティ: {curve.dynamicCommunityId}</div>
                            <div className="text-xs">
                                この遷移は動的コミュニティ {curve.dynamicCommunityId} の一部です。
                                描画順位 {curve.rank} で描画されます。
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};
