'use client';

import React from 'react';
import { useDynamicCommunityStore } from '../store/dynamicCommunityStore';
import { VizConfig } from '../types';
import { Settings, Target, Filter, RefreshCw, AlertCircle } from 'lucide-react';

export const DynamicCommunityControls: React.FC = () => {
    const {
        config,
        setConfig,
        isCalculating,
        calculationProgress,
        isLoading,
        lastUpdated,
        error,
        clearError,
        fetchData,
        refreshData,
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

    const handleEdgeThresholdChange = (type: 'intra' | 'inter', value: number) => {
        handleConfigChange('edgeThreshold', {
            ...config.edgeThreshold,
            [type]: value
        });
    };

    const handleFetchData = async () => {
        await fetchData();
    };

    const handleRefreshData = async () => {
        await refreshData();
    };

    const handleCheckApiStatus = async () => {
        try {
            const response = await fetch('http://localhost:8000/health');
            if (response.ok) {
                alert('バックエンドAPIは正常に動作しています');
            } else {
                alert('バックエンドAPIに問題があります');
            }
        } catch (error) {
            alert('バックエンドAPIに接続できません。サーバーが起動しているか確認してください。');
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
            <div className="flex items-center space-x-2 text-lg font-semibold text-gray-800">
                <Settings className="w-5 h-5" />
                <span>Settings</span>
            </div>

            {/* データ取得 */}
            <div className="space-y-2">
                <div className="flex items-center space-x-2">
                    <RefreshCw className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">データ取得</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={handleFetchData}
                        disabled={isLoading}
                        className="px-3 py-2 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? '取得中...' : 'データ取得'}
                    </button>
                    <button
                        onClick={handleRefreshData}
                        disabled={isLoading}
                        className="px-3 py-2 bg-green-500 text-white rounded text-sm font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <RefreshCw className={`w-4 h-4 inline mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                        更新
                    </button>
                </div>

                {/* API状態確認 */}
                <div className="pt-2">
                    <button
                        onClick={handleCheckApiStatus}
                        className="w-full px-3 py-2 bg-gray-500 text-white rounded text-sm font-medium hover:bg-gray-600"
                    >
                        API状態確認
                    </button>
                </div>

                {/* 最終更新時刻 */}
                {lastUpdated && (
                    <div className="text-xs text-gray-500">
                        最終更新: {lastUpdated.toLocaleString('ja-JP')}
                    </div>
                )}

                {/* エラー表示 */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <span className="text-sm text-red-700">{error}</span>
                        </div>
                        <button
                            onClick={clearError}
                            className="text-xs text-red-600 hover:text-red-800 mt-1"
                        >
                            閉じる
                        </button>
                    </div>
                )}
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
