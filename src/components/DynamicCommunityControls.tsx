'use client';

import React from 'react';
import { useDynamicCommunityStore } from '../store/dynamicCommunityStore';
import { VizConfig } from '../types';
import { Settings, Palette, Target, Filter, Layers, RefreshCw } from 'lucide-react';

export const DynamicCommunityControls: React.FC = () => {
    const {
        config,
        setConfig,
        isCalculating,
        calculationProgress,
        recalculateLayout,
        recalculateTracking,
        recalculateColoring
    } = useDynamicCommunityStore();

    const handleConfigChange = (key: keyof VizConfig, value: any) => {
        setConfig({ [key]: value });
    };

    const handleThetaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value);
        handleConfigChange('theta', value);
    };

    const handleColorModeChange = (mode: VizConfig['colorMode']) => {
        handleConfigChange('colorMode', mode);
    };

    const handleEdgeThresholdChange = (type: 'intra' | 'inter', value: number) => {
        handleConfigChange('edgeThreshold', {
            ...config.edgeThreshold,
            [type]: value
        });
    };

    const handleNodeHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value);
        handleConfigChange('nodeHeight', value);
    };

    const handleGapChange = (type: 'node' | 'community', value: number) => {
        handleConfigChange('gaps', {
            ...config.gaps,
            [type]: value
        });
    };

    const handleDrawOrderChange = (policy: VizConfig['drawOrderPolicy']) => {
        handleConfigChange('drawOrderPolicy', policy);
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
            <div className="flex items-center space-x-2 text-lg font-semibold text-gray-800">
                <Settings className="w-5 h-5" />
                <span>動的コミュニティ可視化設定</span>
            </div>

            {/* 追跡閾値 θ */}
            <div className="space-y-2">
                <div className="flex items-center space-x-2">
                    <Target className="w-4 h-4 text-blue-600" />
                    <label className="text-sm font-medium text-gray-700">
                        追跡閾値 θ: {config.theta.toFixed(2)}
                    </label>
                </div>
                <input
                    type="range"
                    min="0"
                    max="0.9"
                    step="0.05"
                    value={config.theta}
                    onChange={handleThetaChange}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500">
                    <span>0.0</span>
                    <span>0.45</span>
                    <span>0.9</span>
                </div>
                <p className="text-xs text-gray-600">
                    Jaccard類似度の閾値。高いほど厳密な追跡、低いほど緩い追跡
                </p>
            </div>

            {/* カラーモード */}
            <div className="space-y-2">
                <div className="flex items-center space-x-2">
                    <Palette className="w-4 h-4 text-purple-600" />
                    <label className="text-sm font-medium text-gray-700">カラーモード</label>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { key: 'dynamic' as const, label: '動的コミュニティ', color: 'bg-blue-500' },
                        { key: 'cStab' as const, label: 'コミュニティ安定性', color: 'bg-green-500' },
                        { key: 'vStab' as const, label: '頂点安定性', color: 'bg-orange-500' }
                    ].map(({ key, label, color }) => (
                        <button
                            key={key}
                            onClick={() => handleColorModeChange(key)}
                            className={`p-2 rounded text-xs font-medium transition-colors ${config.colorMode === key
                                ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${color}`} />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* エッジ閾値 */}
            <div className="space-y-2">
                <div className="flex items-center space-x-2">
                    <Filter className="w-4 h-4 text-red-600" />
                    <label className="text-sm font-medium text-gray-700">エッジ閾値</label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-gray-600">コミュニティ内</label>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={config.edgeThreshold.intra}
                            onChange={(e) => handleEdgeThresholdChange('intra', parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-xs text-gray-500">{config.edgeThreshold.intra.toFixed(1)}</span>
                    </div>
                    <div>
                        <label className="text-xs text-gray-600">コミュニティ間</label>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={config.edgeThreshold.inter}
                            onChange={(e) => handleEdgeThresholdChange('inter', parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-xs text-gray-500">{config.edgeThreshold.inter.toFixed(1)}</span>
                    </div>
                </div>
            </div>

            {/* レイアウト設定 */}
            <div className="space-y-2">
                <div className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <label className="text-sm font-medium text-gray-700">レイアウト設定</label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-gray-600">ノード高さ: {config.nodeHeight}px</label>
                        <input
                            type="range"
                            min="4"
                            max="12"
                            step="1"
                            value={config.nodeHeight}
                            onChange={handleNodeHeightChange}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-600">描画順序</label>
                        <div className="space-y-1">
                            {[
                                { key: 'groupsFirst' as const, label: 'グループ優先' },
                                { key: 'groupsBack' as const, label: 'グループ背面' }
                            ].map(({ key, label }) => (
                                <button
                                    key={key}
                                    onClick={() => handleDrawOrderChange(key)}
                                    className={`w-full p-1 rounded text-xs ${config.drawOrderPolicy === key
                                        ? 'bg-indigo-100 text-indigo-800'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-gray-600">ノード間隔: {config.gaps.node}px</label>
                        <input
                            type="range"
                            min="0"
                            max="3"
                            step="1"
                            value={config.gaps.node}
                            onChange={(e) => handleGapChange('node', parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-600">コミュニティ間隔: {config.gaps.community}px</label>
                        <input
                            type="range"
                            min="4"
                            max="16"
                            step="2"
                            value={config.gaps.community}
                            onChange={(e) => handleGapChange('community', parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                </div>
            </div>

            {/* 計算ボタン */}
            <div className="space-y-2">
                <div className="flex items-center space-x-2">
                    <RefreshCw className={`w-4 h-4 ${isCalculating ? 'animate-spin' : ''}`} />
                    <span className="text-sm font-medium text-gray-700">計算実行</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <button
                        onClick={recalculateTracking}
                        disabled={isCalculating}
                        className="px-3 py-2 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        追跡再計算
                    </button>
                    <button
                        onClick={recalculateLayout}
                        disabled={isCalculating}
                        className="px-3 py-2 bg-green-500 text-white rounded text-sm font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        レイアウト最適化
                    </button>
                    <button
                        onClick={recalculateColoring}
                        disabled={isCalculating}
                        className="px-3 py-2 bg-purple-500 text-white rounded text-sm font-medium hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        色最適化
                    </button>
                </div>
                {isCalculating && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${calculationProgress}%` }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
