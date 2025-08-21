'use client';

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useDynamicCommunityStore } from '../store/dynamicCommunityStore';
import { useVizStore } from '../store/vizStore';
import { Timestamp } from '../types';

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
        margin: { top: 24, right: 24, bottom: 24, left: 120 }
    });

    const {
        timestamps,
        communityBlocks,
        transitionCurves,
        config,
        selectedNodeId,
        selectedCommunityId,
        hoveredElement,
        setHoveredElement,
        fetchData,
        isLoading,
        error
    } = useDynamicCommunityStore();

    // フィルタリング用のストア
    const {
        selectedCommunities,
        toggleCommunity,
        timeRange,
        currentTime
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
                    margin: { top: 24, right: 24, bottom: 24, left: 120 }
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

        return { blocks: filteredBlocksByTime, curves: filteredCurves };
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

            // 背景色（密度に基づく）
            const densityColor = d3.scaleSequential()
                .domain([0, 1])
                .interpolator(d3.interpolateRgb.gamma(2.2)("#f0f0f0", "#404040"));

            ctx.fillStyle = densityColor(block.density);
            ctx.fillRect(x - 25, y0, 50, blockHeight);

            // 境界線
            ctx.strokeStyle = selectedCommunityId === block.communityId ? '#3b82f6' : '#d1d5db';
            ctx.lineWidth = selectedCommunityId === block.communityId ? 3 : 1;
            ctx.strokeRect(x - 25, y0, 50, blockHeight);

            // コミュニティIDラベル
            ctx.fillStyle = '#374151';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(block.label, x, y0 - 8);

            // 密度と安定性のインジケーター
            const densityBarWidth = 40;
            const densityBarHeight = 4;
            const densityBarY = y1 - 15;

            // 密度バー
            ctx.fillStyle = '#d1d5db';
            ctx.fillRect(x - densityBarWidth / 2, densityBarY, densityBarWidth, densityBarHeight);
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(x - densityBarWidth / 2, densityBarY, densityBarWidth * block.density, densityBarHeight);

            // 安定性バー
            const stabilityBarY = y1 - 8;
            ctx.fillStyle = '#d1d5db';
            ctx.fillRect(x - densityBarWidth / 2, stabilityBarY, densityBarWidth, densityBarHeight);
            ctx.fillStyle = '#10b981';
            ctx.fillRect(x - densityBarWidth / 2, stabilityBarY, densityBarWidth * block.stability, densityBarHeight);
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

            const y1 = scales.yScale(curve.source.y);
            const y2 = scales.yScale(curve.target.y);

            // 色の決定
            let color: string;
            switch (config.colorMode) {
                case 'dynamic':
                    color = d3.schemeCategory10[parseInt(curve.dynamicCommunityId.slice(1)) % 10];
                    break;
                case 'cStab':
                    // コミュニティ安定性に基づく色（青系）
                    const stability = curve.weight / Math.max(...transitionCurves.map(c => c.weight));
                    color = d3.scaleSequential()
                        .domain([0, 1])
                        .interpolator(d3.interpolateBlues)(stability);
                    break;
                case 'vStab':
                    // 頂点安定性に基づく色（緑系）
                    const avgStability = curve.nodes.reduce((sum: number, nodeId: string) => {
                        // TODO: 実際の頂点安定性データを使用
                        return sum + 0.5;
                    }, 0) / curve.nodes.length;
                    color = d3.scaleSequential()
                        .domain([0, 1])
                        .interpolator(d3.interpolateGreens)(avgStability);
                    break;
                default:
                    color = '#6b7280';
            }

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

            // ハロー効果
            ctx.strokeStyle = 'rgba(0,0,0,0.1)';
            ctx.lineWidth = strokeWidth + 4;
            ctx.beginPath();
            drawBezierCurve(ctx, x1, y1, x2, y2);
            ctx.stroke();

            // メインの線
            ctx.strokeStyle = color;
            ctx.lineWidth = strokeWidth;
            ctx.beginPath();
            drawBezierCurve(ctx, x1, y1, x2, y2);
            ctx.stroke();

            // 線のスタイルをリセット
            ctx.setLineDash([]);

            // ホバー効果
            if (hoveredElement?.type === 'curve' && hoveredElement.id === `${curve.source.t}-${curve.source.community}-${curve.target.t}-${curve.target.community}`) {
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = strokeWidth + 2;
                ctx.beginPath();
                drawBezierCurve(ctx, x1, y1, x2, y2);
                ctx.stroke();
            }

            // 遷移の重みラベル
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;

            // 背景
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillRect(midX - 15, midY - 8, 30, 16);

            // テキスト
            ctx.fillStyle = color;
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(curve.weight.toString(), midX, midY + 3);
        });

        ctx.restore();
    }, [transitionCurves, config.colorMode, hoveredElement, dimensions]);

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

    // 凡例の描画
    const drawLegend = useCallback((ctx: CanvasRenderingContext2D) => {
        ctx.save();

        const legendX = dimensions.width - 150;
        const legendY = 50;

        // 凡例の背景
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(legendX - 10, legendY - 10, 140, 120);
        ctx.strokeStyle = '#d1d5db';
        ctx.lineWidth = 1;
        ctx.strokeRect(legendX - 10, legendY - 10, 140, 120);

        // 凡例タイトル
        ctx.fillStyle = '#374151';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('凡例', legendX, legendY);

        // 密度バー
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(legendX, legendY + 15, 20, 8);
        ctx.fillStyle = '#6b7280';
        ctx.font = '10px sans-serif';
        ctx.fillText('密度', legendX + 25, legendY + 22);

        // 安定性バー
        ctx.fillStyle = '#10b981';
        ctx.fillRect(legendX, legendY + 30, 20, 8);
        ctx.fillStyle = '#6b7280';
        ctx.fillText('安定性', legendX + 25, legendY + 37);

        // 遷移曲線
        ctx.strokeStyle = '#6b7280';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(legendX, legendY + 45);
        ctx.lineTo(legendX + 20, legendY + 45);
        ctx.stroke();
        ctx.fillStyle = '#6b7280';
        ctx.fillText('遷移', legendX + 25, legendY + 50);

        // 選択状態
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.strokeRect(legendX, legendY + 60, 20, 12);
        ctx.fillStyle = '#6b7280';
        ctx.fillText('選択', legendX + 25, legendY + 68);

        ctx.restore();
    }, [dimensions]);

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
        drawCommunityBlocks(ctx, scalesData, filteredData.blocks);
        drawTransitionCurves(ctx, scalesData, filteredData.curves);

        // 凡例の描画
        drawLegend(ctx);
    }, [dimensions, scales, drawAxes, drawCommunityBlocks, drawTransitionCurves, drawLegend, filteredData]);

    // 描画の実行
    useEffect(() => {
        draw();
    }, [draw]);

    // マウスイベントの処理
    const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // ホバー判定（簡易版）
        // TODO: より精密なヒットテストを実装
        const scalesData = scales();
        if (!scalesData) return;

        // コミュニティブロックのホバー判定
        const hoveredBlock = communityBlocks.find(block => {
            const blockX = scalesData.xScale(block.t);
            if (blockX === undefined) return false;

            const blockY0 = scalesData.yScale(block.y0);
            const blockY1 = scalesData.yScale(block.y1);

            return x >= blockX - 25 && x <= blockX + 25 &&
                y >= blockY0 && y <= blockY1;
        });

        if (hoveredBlock) {
            setHoveredElement({ type: 'community', id: hoveredBlock.communityId });
        } else {
            setHoveredElement(null);
        }
    }, [communityBlocks, scales, setHoveredElement]);

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
                <div className="text-gray-500">データを読み込み中...</div>
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
                onMouseMove={handleMouseMove}
                onClick={handleClick}
            />
        </div>
    );
};
