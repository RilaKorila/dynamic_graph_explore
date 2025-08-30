'use client';

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useDynamicCommunityStore } from '../store/dynamicCommunityStore';
import { useVizStore } from '../store/vizStore';
import { Timestamp } from '../types';
import { getCommunityColorForBigCommunity } from '../lib/colors';

interface CanvasDimensions {
    width: number;
    height: number;
    margin: { top: number; right: number; bottom: number; left: number };
}

export const DynamicCommunityCanvas: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState<CanvasDimensions>({
        width: 800,
        height: 1000,
        margin: { top: 24, right: 24, bottom: 24, left: 24 }
    });

    const {
        timestamps,
        communityBlocks,
        transitionCurves,
        selectedCommunityId,
        fetchData,
        isLoading,
        error
    } = useDynamicCommunityStore();

    // フィルタリング用のストア
    const {
        selectedCommunities,
        toggleCommunity,
        timeRange,
    } = useVizStore();

    // データの取得
    useEffect(() => {
        if (timestamps.length === 0) {
            fetchData();
        }
    }, [timestamps.length, fetchData]);

    // キャンバスサイズの調整
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setDimensions({
                    width: rect.width,
                    height: rect.height,
                    margin: { top: 24, right: 24, bottom: 24, left: 24 }
                });
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // フィルタリングされたデータの計算
    const filteredData = useMemo(() => {
        if (timestamps.length === 0) return { blocks: [], curves: [] };

        // 選択されたコミュニティでフィルタリング
        const filteredBlocks = selectedCommunities.size === 0
            ? communityBlocks
            : communityBlocks.filter(block => selectedCommunities.has(block.communityId));

        // 時間範囲でフィルタリング
        const filteredBlocksByTime = timeRange
            ? filteredBlocks.filter(block => {
                return block.t >= timeRange[0] && block.t <= timeRange[1];
            })
            : filteredBlocks;

        // 遷移曲線も同様にフィルタリング
        const filteredCurves = selectedCommunities.size === 0
            ? transitionCurves
            : transitionCurves.filter(curve =>
                selectedCommunities.has(curve.source.community) ||
                selectedCommunities.has(curve.target.community)
            );

        // 時間範囲で遷移曲線もフィルタリング
        const filteredCurvesByTime = timeRange
            ? filteredCurves.filter(curve => {
                const sourceTime = curve.source.t;
                const targetTime = curve.target.t;
                return (sourceTime >= timeRange[0] && sourceTime <= timeRange[1]) ||
                    (targetTime >= timeRange[0] && targetTime <= timeRange[1]);
            })
            : filteredCurves;

        return { blocks: filteredBlocksByTime, curves: filteredCurvesByTime };
    }, [communityBlocks, transitionCurves, selectedCommunities, timeRange, timestamps]);

    // D3スケールの設定
    const scales = useCallback(() => {
        if (timestamps.length === 0) return null;

        const chartWidth = dimensions.width - dimensions.margin.left - dimensions.margin.right;
        const chartHeight = dimensions.height - dimensions.margin.top - dimensions.margin.bottom;

        const xScale = d3.scalePoint<Timestamp>()
            .domain(timestamps)
            .range([dimensions.margin.left, dimensions.width - dimensions.margin.right]);

        const yScale = d3.scaleLinear()
            .domain([0, 1])
            .range([dimensions.margin.top, dimensions.height - dimensions.margin.bottom]);

        return { xScale, yScale, chartWidth, chartHeight };
    }, [timestamps, dimensions]);

    // コミュニティブロックの描画
    const drawCommunityBlocks = useCallback((ctx: CanvasRenderingContext2D, scales: any, blocks: any[] = communityBlocks) => {
        if (!scales) return;

        ctx.save();

        blocks.forEach(block => {
            const x = scales.xScale(block.t);
            if (x === undefined) return;

            const y0 = scales.yScale(block.y0);
            const y1 = scales.yScale(block.y1);
            const blockHeight = y1 - y0;

            // 背景色（動的コミュニティIDベース、Graphと同じ色）
            // const communityColor = getDynamicCommunityColor(block.dynamicCommunityId);
            console.log('block.size', block.communitySize)
            const communityColor = getCommunityColorForBigCommunity(block.communitySize, block.dynamicCommunityId);
            ctx.fillStyle = communityColor;
            ctx.fillRect(x - 25, y0, 50, blockHeight);

            // 境界線
            ctx.strokeStyle = selectedCommunityId === block.communityId ? '#1f2937' : '#d1d5db';
            ctx.lineWidth = selectedCommunityId === block.communityId ? 3 : 1;
            ctx.strokeRect(x - 25, y0, 50, blockHeight);

            // コミュニティIDラベル
            ctx.fillStyle = '#374151';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(block.label, x, (y0 + y1) / 2);

            // 密度と安定性のインジケーター
            // const densityBarWidth = 40;
            // const densityBarHeight = 4;
            // const densityBarY = y1 - 15;

            // // 密度バー
            // ctx.fillStyle = '#d1d5db';
            // ctx.fillRect(x - densityBarWidth / 2, densityBarY, densityBarWidth, densityBarHeight);
            // ctx.fillStyle = communityColor;
            // ctx.fillRect(x - densityBarWidth / 2, densityBarY, densityBarWidth * block.density, densityBarHeight);

            // // 安定性バー
            // const stabilityBarY = y1 - 8;
            // ctx.fillStyle = '#d1d5db';
            // ctx.fillRect(x - densityBarWidth / 2, stabilityBarY, densityBarWidth, densityBarHeight);
            // ctx.fillStyle = communityColor;
            // ctx.fillRect(x - densityBarWidth / 2, stabilityBarY, densityBarWidth * block.stability, densityBarHeight);
        });

        ctx.restore();
    }, [communityBlocks, selectedCommunityId, dimensions]);

    // 遷移曲線の描画
    const drawTransitionCurves = useCallback((ctx: CanvasRenderingContext2D, scales: any, curves: any[] = transitionCurves) => {
        if (!scales) return;

        ctx.save();

        // 描画順序でソート（rankが高いものを後で描画）
        const sortedCurves = [...curves].sort((a, b) => a.rank - b.rank);

        sortedCurves.forEach(curve => {
            const x1 = scales.xScale(curve.source.t);
            const x2 = scales.xScale(curve.target.t);
            if (x1 === undefined || x2 === undefined) return;

            // CommunityBlockの位置からY座標を計算
            const sourceBlock = communityBlocks.find(block =>
                block.t === curve.source.t &&
                block.communityId === curve.source.community
            );
            const targetBlock = communityBlocks.find(block =>
                block.t === curve.target.t &&
                block.communityId === curve.target.community
            );

            if (!sourceBlock || !targetBlock) {
                console.warn('対応するCommunityBlockが見つかりません:', curve);
                return;
            }

            // ブロックの中心Y座標を使用
            const y1 = scales.yScale((sourceBlock.y0 + sourceBlock.y1) / 2);
            const y2 = scales.yScale((targetBlock.y0 + targetBlock.y1) / 2);
            // 線の太さ（重みに基づく）
            const strokeWidth = Math.max(1, Math.sqrt(curve.weight) * 2);

            // 分裂パターンの検知（同じソースから複数の遷移がある場合）
            const isSplitPattern = transitionCurves.filter(c =>
                c.source.t === curve.source.t &&
                c.source.community === curve.source.community
            ).length > 1;

            // 分裂パターンの場合は線を点線にする
            if (isSplitPattern) {
                ctx.setLineDash([5, 5]);
            } else {
                ctx.setLineDash([]);
            }

            // ハロー効果 (edgeの交差を見やすくする手法・論文に記述あり)
            ctx.strokeStyle = 'rgba(0,0,0,0.1)';
            ctx.lineWidth = strokeWidth + 4;
            ctx.beginPath();
            drawBezierCurve(ctx, x1, y1, x2, y2);
            ctx.stroke();

            // メインの線
            ctx.strokeStyle = "#a9a9a9";
            ctx.lineWidth = strokeWidth;
            ctx.beginPath();
            drawBezierCurve(ctx, x1, y1, x2, y2);
            ctx.stroke();
        });

        ctx.restore();
    }, [transitionCurves, communityBlocks, dimensions]);

    // ベジェ曲線の描画
    const drawBezierCurve = useCallback((ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
        const dx = x2 - x1;
        const controlOffset = dx * 0.35;

        ctx.moveTo(x1, y1);
        ctx.bezierCurveTo(
            x1 + controlOffset, y1,
            x2 - controlOffset, y2,
            x2, y2
        );
    }, []);

    // 軸の描画
    const drawAxes = useCallback((ctx: CanvasRenderingContext2D, scales: any) => {
        if (!scales) return;

        ctx.save();
        ctx.strokeStyle = '#9ca3af';
        ctx.lineWidth = 1;

        // Y軸
        ctx.beginPath();
        ctx.moveTo(dimensions.margin.left, dimensions.margin.top);
        ctx.lineTo(dimensions.margin.left, dimensions.height - dimensions.margin.bottom);
        ctx.stroke();

        // X軸（各時刻）
        timestamps.forEach(timestamp => {
            const x = scales.xScale(timestamp);
            if (x === undefined) return;

            ctx.beginPath();
            ctx.moveTo(x, dimensions.height - dimensions.margin.bottom);
            ctx.lineTo(x, dimensions.height - dimensions.margin.bottom + 5);
            ctx.stroke();

            // 時刻ラベル
            ctx.fillStyle = '#6b7280';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(timestamp, x, dimensions.height - dimensions.margin.bottom + 20);
        });

        // 軸ラベル
        ctx.fillStyle = '#374151';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';

        // Y軸ラベル
        ctx.save();
        ctx.translate(dimensions.margin.left - 20, dimensions.height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.restore();

        // X軸ラベル
        ctx.fillText('timestamps', dimensions.width / 2, dimensions.height - 5);

        ctx.restore();
    }, [timestamps, dimensions]);

    // メインの描画関数
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // キャンバスのクリア
        ctx.clearRect(0, 0, dimensions.width, dimensions.height);

        const scalesData = scales();
        if (!scalesData) return;

        // 背景
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, dimensions.width, dimensions.height);

        // 軸の描画
        drawAxes(ctx, scalesData);

        // フィルタリングされたデータで描画
        drawTransitionCurves(ctx, scalesData, filteredData.curves);
        drawCommunityBlocks(ctx, scalesData, filteredData.blocks);
    }, [dimensions, scales, drawAxes, drawCommunityBlocks, drawTransitionCurves, filteredData]);

    // 描画の実行
    useEffect(() => {
        draw();
    }, [draw]);

    // マウスイベントの処理
    const handleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // クリック判定（簡易版）
        const scalesData = scales();
        if (!scalesData) return;

        // コミュニティブロックのクリック判定
        const clickedBlock = communityBlocks.find(block => {
            const blockX = scalesData.xScale(block.t);
            if (blockX === undefined) return false;

            const blockY0 = scalesData.yScale(block.y0);
            const blockY1 = scalesData.yScale(block.y1);

            return x >= blockX - 25 && x <= blockX + 25 &&
                y >= blockY0 && y <= blockY1;
        });

        if (clickedBlock) {
            // コミュニティの選択状態を切り替え
            toggleCommunity(clickedBlock.communityId);
        }
    }, [communityBlocks, scales, toggleCommunity]);

    // ローディング状態の表示
    if (isLoading) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <div className="text-gray-500">Loading Views...</div>
            </div>
        );
    }

    // エラー状態の表示
    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <div className="text-red-500">エラー: {error}</div>
            </div>
        );
    }

    // データがない場合の表示
    if (timestamps.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <div className="text-gray-500">データがありません</div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="w-full h-full">
            <canvas
                ref={canvasRef}
                width={dimensions.width}
                height={dimensions.height}
                className="border border-gray-300 rounded-lg cursor-crosshair"
                onClick={handleClick}
            />
        </div>
    );
};
