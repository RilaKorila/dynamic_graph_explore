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

// サンプルデータ（実際の実装ではAPIから取得）
const sampleData = {
    timestamps: ['2021Q1', '2021Q2', '2021Q3', '2021Q4'] as Timestamp[],

    communityBlocks: [
        {
            t: '2021Q1' as Timestamp,
            communityId: 'C1' as CommunityId,
            y0: 0.0,
            y1: 0.3,
            nodes: ['1', '2', '3', '4', '5'],
            density: 0.8,
            stability: 0.9
        },
        {
            t: '2021Q1' as Timestamp,
            communityId: 'C2' as CommunityId,
            y0: 0.4,
            y1: 0.7,
            nodes: ['6', '7', '8', '9'],
            density: 0.6,
            stability: 0.7,
        },
        {
            t: '2021Q1' as Timestamp,
            communityId: 'C3' as CommunityId,
            y0: 0.8,
            y1: 1.0,
            nodes: ['10', '11', '12'],
            density: 0.4,
            stability: 0.5,
        },
        {
            t: '2021Q2' as Timestamp,
            communityId: 'C1' as CommunityId,
            y0: 0.0,
            y1: 0.35,
            nodes: ['1', '2', '3', '4', '5', '13'],
            density: 0.75,
            stability: 0.85,
        },
        {
            t: '2021Q2' as Timestamp,
            communityId: 'C2' as CommunityId,
            y0: 0.45,
            y1: 0.75,
            nodes: ['6', '7', '8', '9'],
            density: 0.65,
            stability: 0.75,
        },
        {
            t: '2021Q2' as Timestamp,
            communityId: 'C4' as CommunityId,
            y0: 0.85,
            y1: 1.0,
            nodes: ['14', '15'],
            density: 0.3,
            stability: 0.4,
        },
        {
            t: '2021Q3' as Timestamp,
            communityId: 'C1' as CommunityId,
            y0: 0.0,
            y1: 0.4,
            nodes: ['1', '2', '3', '4', '5', '13', '16'],
            density: 0.7,
            stability: 0.8,
        },
        {
            t: '2021Q3' as Timestamp,
            communityId: 'C2' as CommunityId,
            y0: 0.5,
            y1: 0.8,
            nodes: ['6', '7', '8', '9', '17'],
            density: 0.6,
            stability: 0.7,
        },
        {
            t: '2021Q3' as Timestamp,
            communityId: 'C5' as CommunityId,
            y0: 0.9,
            y1: 1.0,
            nodes: ['18'],
            density: 0.2,
            stability: 0.3,
        },
        {
            t: '2021Q4' as Timestamp,
            communityId: 'C1' as CommunityId,
            y0: 0.0,
            y1: 0.45,
            nodes: ['1', '2', '3', '4', '5', '13', '16', '19'],
            density: 0.65,
            stability: 0.75,
        },
        {
            t: '2021Q4' as Timestamp,
            communityId: 'C2' as CommunityId,
            y0: 0.55,
            y1: 0.85,
            nodes: ['6', '7', '8', '9', '17', '20'],
            density: 0.55,
            stability: 0.65,
        },
        {
            t: '2021Q4' as Timestamp,
            communityId: 'C6' as CommunityId,
            y0: 0.95,
            y1: 1.0,
            nodes: ['21'],
            density: 0.15,
            stability: 0.25,
        }
    ] as CommunityBlock[],

    transitionCurves: [
        {
            source: { t: '2021Q1' as Timestamp, y: 0.15, community: 'C1' as CommunityId },
            target: { t: '2021Q2' as Timestamp, y: 0.175, community: 'C1' as CommunityId },
            nodes: ['1', '2', '3', '4', '5'],
            weight: 5.0,
            rank: 1,
            dynamicCommunityId: 'D1'
        },
        {
            source: { t: '2021Q2' as Timestamp, y: 0.175, community: 'C1' as CommunityId },
            target: { t: '2021Q3' as Timestamp, y: 0.2, community: 'C1' as CommunityId },
            nodes: ['1', '2', '3', '4', '5', '13'],
            weight: 6.0,
            rank: 1,
            dynamicCommunityId: 'D1'
        },
        {
            source: { t: '2021Q3' as Timestamp, y: 0.2, community: 'C1' as CommunityId },
            target: { t: '2021Q4' as Timestamp, y: 0.225, community: 'C1' as CommunityId },
            nodes: ['1', '2', '3', '4', '5', '13', '16'],
            weight: 7.0,
            rank: 1,
            dynamicCommunityId: 'D1'
        },
        {
            source: { t: '2021Q1' as Timestamp, y: 0.55, community: 'C2' as CommunityId },
            target: { t: '2021Q2' as Timestamp, y: 0.6, community: 'C2' as CommunityId },
            nodes: ['6', '7', '8', '9'],
            weight: 4.0,
            rank: 2,
            dynamicCommunityId: 'D2'
        },
        {
            source: { t: '2021Q2' as Timestamp, y: 0.6, community: 'C2' as CommunityId },
            target: { t: '2021Q3' as Timestamp, y: 0.65, community: 'C2' as CommunityId },
            nodes: ['6', '7', '8', '9'],
            weight: 4.0,
            rank: 2,
            dynamicCommunityId: 'D2'
        },
        {
            source: { t: '2021Q3' as Timestamp, y: 0.65, community: 'C2' as CommunityId },
            target: { t: '2021Q4' as Timestamp, y: 0.7, community: 'C2' as CommunityId },
            nodes: ['6', '7', '8', '9', '17'],
            weight: 5.0,
            rank: 2,
            dynamicCommunityId: 'D2'
        },
        {
            source: { t: '2021Q1' as Timestamp, y: 0.9, community: 'C3' as CommunityId },
            target: { t: '2021Q2' as Timestamp, y: 0.925, community: 'C4' as CommunityId },
            nodes: ['10', '11'],
            weight: 2.0,
            rank: 3,
            dynamicCommunityId: 'D3'
        },
        {
            source: { t: '2021Q2' as Timestamp, y: 0.925, community: 'C4' as CommunityId },
            target: { t: '2021Q3' as Timestamp, y: 0.95, community: 'C5' as CommunityId },
            nodes: ['10'],
            weight: 1.0,
            rank: 4,
            dynamicCommunityId: 'D3'
        },
        {
            source: { t: '2021Q1' as Timestamp, y: 0.9, community: 'C3' as CommunityId },
            target: { t: '2021Q2' as Timestamp, y: 0.925, community: 'C4' as CommunityId },
            nodes: ['12'],
            weight: 1.0,
            rank: 5,
            dynamicCommunityId: 'D4'
        }
    ] as TransitionCurve[],

    dynamicCommunities: [
        {
            id: 'D1',
            timeline: [
                { t: '2021Q1' as Timestamp, community: 'C1' as CommunityId },
                { t: '2021Q2' as Timestamp, community: 'C1' as CommunityId },
                { t: '2021Q3' as Timestamp, community: 'C1' as CommunityId },
                { t: '2021Q4' as Timestamp, community: 'C1' as CommunityId }
            ],
            stability: 0.85,
            color: '#1f77b4'
        },
        {
            id: 'D2',
            timeline: [
                { t: '2021Q1' as Timestamp, community: 'C2' as CommunityId },
                { t: '2021Q2' as Timestamp, community: 'C2' as CommunityId },
                { t: '2021Q3' as Timestamp, community: 'C2' as CommunityId },
                { t: '2021Q4' as Timestamp, community: 'C2' as CommunityId }
            ],
            stability: 0.75,
            color: '#ff7f0e'
        },
        {
            id: 'D3',
            timeline: [
                { t: '2021Q1' as Timestamp, community: 'C3' as CommunityId },
                { t: '2021Q2' as Timestamp, community: 'C4' as CommunityId },
                { t: '2021Q3' as Timestamp, community: 'C5' as CommunityId }
            ],
            stability: 0.6,
            color: '#2ca02c'
        },
        {
            id: 'D4',
            timeline: [
                { t: '2021Q1' as Timestamp, community: 'C3' as CommunityId },
                { t: '2021Q2' as Timestamp, community: 'C4' as CommunityId }
            ],
            stability: 0.5,
            color: '#d62728'
        }
    ] as DynamicCommunity[],

    vertexStabilities: [
        { node: '1', stability: 0.9 },
        { node: '2', stability: 0.9 },
        { node: '3', stability: 0.9 },
        { node: '4', stability: 0.9 },
        { node: '5', stability: 0.9 },
        { node: '6', stability: 0.8 },
        { node: '7', stability: 0.8 },
        { node: '8', stability: 0.8 },
        { node: '9', stability: 0.8 },
        { node: '10', stability: 0.6 },
        { node: '11', stability: 0.6 },
        { node: '12', stability: 0.5 },
        { node: '13', stability: 0.7 },
        { node: '14', stability: 0.4 },
        { node: '15', stability: 0.4 },
        { node: '16', stability: 0.6 },
        { node: '17', stability: 0.7 },
        { node: '18', stability: 0.3 },
        { node: '19', stability: 0.5 },
        { node: '20', stability: 0.6 },
        { node: '21', stability: 0.25 }
    ] as VertexStability[]
};

export default function DynamicCommunitiesPage() {
    const {
        setTimestamps,
        setCommunityBlocks,
        setTransitionCurves,
        setDynamicCommunities,
        setVertexStabilities
    } = useDynamicCommunityStore();

    // サンプルデータの読み込み
    useEffect(() => {
        setTimestamps(sampleData.timestamps);
        setCommunityBlocks(sampleData.communityBlocks);
        setTransitionCurves(sampleData.transitionCurves);
        setDynamicCommunities(sampleData.dynamicCommunities);
        setVertexStabilities(sampleData.vertexStabilities);
    }, [setTimestamps, setCommunityBlocks, setTransitionCurves, setDynamicCommunities, setVertexStabilities]);

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-8">
                {/* ヘッダー */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        動的コミュニティ可視化
                    </h1>
                </div>

                {/* メインコンテンツ */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* 左サイドバー - コントロール */}
                    <div className="lg:col-span-1">
                        <DynamicCommunityControls />
                    </div>

                    {/* メインキャンバス */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-lg shadow-lg p-4">
                            <div className="h-[600px]">
                                <DynamicCommunityCanvas />
                            </div>
                        </div>
                    </div>

                    {/* 右サイドバー - 詳細情報 */}
                    <div className="lg:col-span-1">
                        <DynamicCommunityDetails />
                    </div>
                </div>

            </div>
        </div>
    );
}
