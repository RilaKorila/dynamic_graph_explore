'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as d3 from 'd3';
import { useDynamicCommunityStore } from '../store/dynamicCommunityStore';
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
        height: 600,
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
        setHoveredElement
    } = useDynamicCommunityStore();

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
    const drawCommunityBlocks = useCallback((ctx: CanvasRenderingContext2D, scales: any) => {
        if (!scales) return;

        ctx.save();

        communityBlocks.forEach(block => {
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
            ctx.fillRect(x - 20, y0, 40, blockHeight);

            // 境界線
            ctx.strokeStyle = selectedCommunityId === block.communityId ? '#3b82f6' : '#d1d5db';
            ctx.lineWidth = selectedCommunityId === block.communityId ? 3 : 1;
            ctx.strokeRect(x - 20, y0, 40, blockHeight);

            // ラベル
            ctx.fillStyle = '#374151';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(block.communityId, x, y0 - 5);
        });

        ctx.restore();
    }, [communityBlocks, selectedCommunityId, dimensions]);

    // 遷移曲線の描画
    const drawTransitionCurves = useCallback((ctx: CanvasRenderingContext2D, scales: any) => {
        if (!scales) return;

        ctx.save();

        // 描画順序でソート（rankが高いものを後で描画）
        const sortedCurves = [...transitionCurves].sort((a, b) => a.rank - b.rank);

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
                    const avgStability = curve.nodes.reduce((sum, nodeId) => {
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

            // ホバー効果
            if (hoveredElement?.type === 'curve' && hoveredElement.id === `${curve.source.t}-${curve.source.community}-${curve.target.t}-${curve.target.community}`) {
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = strokeWidth + 2;
                ctx.beginPath();
                drawBezierCurve(ctx, x1, y1, x2, y2);
                ctx.stroke();
            }
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
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(timestamp, x, dimensions.height - dimensions.margin.bottom + 20);
        });

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

        // コミュニティブロックの描画
        drawCommunityBlocks(ctx, scalesData);

        // 遷移曲線の描画
        drawTransitionCurves(ctx, scalesData);
    }, [dimensions, scales, drawAxes, drawCommunityBlocks, drawTransitionCurves]);

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

            return x >= blockX - 20 && x <= blockX + 20 &&
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

            return x >= blockX - 20 && x <= blockX + 20 &&
                y >= blockY0 && y <= blockY1;
        });

        if (clickedBlock) {
            // TODO: 選択状態の更新
            console.log('Clicked community:', clickedBlock.communityId);
        }
    }, [communityBlocks, scales]);

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
