'use client'

import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { useVizStore } from '@/store/vizStore'
import { fetchAlluvialNodes, fetchAlluvialLinks } from '@/lib/api'
import { AlluvialNode, AlluvialLink } from '@/types'

interface AlluvialData {
    nodes: AlluvialNode[]
    links: AlluvialLink[]
}

export default function AlluvialChart() {
    const svgRef = useRef<SVGSVGElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [data, setData] = useState<AlluvialData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const { timeRange, selectedCommunities, toggleCommunity, setBrush } = useVizStore()

    // データの取得
    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true)
                const [nodes, links] = await Promise.all([
                    fetchAlluvialNodes(),
                    fetchAlluvialLinks()
                ])
                setData({ nodes, links })
            } catch (err) {
                setError('データの読み込みに失敗しました')
                console.error('Error loading alluvial data:', err)
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [])

    // D3 Alluvial図の描画
    useEffect(() => {
        if (!data || !svgRef.current || !containerRef.current) return

        const svg = d3.select(svgRef.current)
        svg.selectAll('*').remove() // 既存の要素をクリア

        const container = containerRef.current
        const width = container.clientWidth
        const height = container.clientHeight
        const margin = { top: 20, right: 20, bottom: 40, left: 60 }

        const chartWidth = width - margin.left - margin.right
        const chartHeight = height - margin.top - margin.bottom

        // 時間軸の設定
        const timeScale = d3.scaleBand()
            .domain(['2021Q1', '2021Q2', '2021Q3'])
            .range([0, chartWidth])
            .padding(0.1)

        // サイズ軸の設定
        const sizeScale = d3.scaleLinear()
            .domain([0, d3.max(data.nodes, (d: AlluvialNode) => d.size) || 0])
            .range([0, chartHeight * 0.8])

        // コミュニティ色の設定
        const communityColors = {
            C1: '#3B82F6',
            C2: '#10B981',
            C3: '#F59E0B'
        }

        // 各時刻スライスの描画
        const timeSlices = ['2021Q1', '2021Q2', '2021Q3']

        timeSlices.forEach((time, timeIndex) => {
            const timeNodes = data.nodes.filter((d: AlluvialNode) => d.time === time)
            const x = timeScale(time) || 0

            // コミュニティブロックの描画
            let currentY = margin.top
            timeNodes.forEach((node, nodeIndex) => {
                const blockHeight = sizeScale(node.size)
                const blockWidth = timeScale.bandwidth() * 0.8

                // ブロックの描画
                const block = svg.append('rect')
                    .attr('x', margin.left + x + timeScale.bandwidth() * 0.1)
                    .attr('y', currentY)
                    .attr('width', blockWidth)
                    .attr('height', blockHeight)
                    .attr('fill', communityColors[node.community_id as keyof typeof communityColors] || '#gray')
                    .attr('stroke', selectedCommunities.has(node.community_id) ? '#1F2937' : 'none')
                    .attr('stroke-width', selectedCommunities.has(node.community_id) ? 3 : 0)
                    .attr('opacity', selectedCommunities.has(node.community_id) ? 1 : 0.7)
                    .attr('class', 'community-block')
                    .attr('data-community', node.community_id)
                    .attr('data-time', time)
                    .style('cursor', 'pointer')

                // ラベルの描画
                svg.append('text')
                    .attr('x', margin.left + x + timeScale.bandwidth() * 0.5)
                    .attr('y', currentY + blockHeight / 2)
                    .attr('text-anchor', 'middle')
                    .attr('dominant-baseline', 'middle')
                    .attr('fill', '#374151')
                    .attr('font-size', '12px')
                    .attr('font-weight', '500')
                    .text(`${node.community_id}: ${node.size}`)

                // クリックイベント
                block.on('click', () => {
                    toggleCommunity(node.community_id)
                })

                // 縦方向ブラッシングの実装
                const brushGroup = svg.append('g')
                    .attr('class', 'brush-group')
                    .attr('transform', `translate(${margin.left + x}, 0)`)

                const brush = d3.brushY()
                    .extent([[0, margin.top], [timeScale.bandwidth(), margin.top + chartHeight]])
                    .on('brush', (event: d3.D3BrushEvent<unknown>) => {
                        if (!event.selection) return

                        const [y0, y1] = event.selection
                        const selectedCommunities = new Set<string>()

                        // 重なり面積率の計算（既定：≥0.5）
                        timeNodes.forEach(n => {
                            const blockY = currentY
                            const blockHeight = sizeScale(n.size)
                            const overlapStart = Math.max(y0, blockY)
                            const overlapEnd = Math.min(y1, blockY + blockHeight)
                            const overlapHeight = Math.max(0, overlapEnd - overlapStart)
                            const overlapRatio = overlapHeight / blockHeight

                            if (overlapRatio >= 0.5) {
                                selectedCommunities.add(n.community_id)
                            }
                        })

                        // 選択状態の更新
                        selectedCommunities.forEach(id => {
                            if (!useVizStore.getState().selectedCommunities.has(id)) {
                                toggleCommunity(id)
                            }
                        })

                        // 非選択のコミュニティをフェード（安全な処理）
                        svg.selectAll('.community-block').each(function (this: Element) {
                            const element = d3.select(this)
                            const communityId = element.attr('data-community')
                            if (communityId) {
                                const isSelected = selectedCommunities.has(communityId)
                                element.attr('opacity', isSelected ? 1 : 0.3)
                            }
                        })
                    })
                    .on('end', (event: d3.D3BrushEvent<unknown>) => {
                        if (!event.selection) return

                        // ブラッシング確定時の処理
                        const [y0, y1] = event.selection
                        const selectedCommunities = new Set<string>()

                        timeNodes.forEach(n => {
                            const blockY = currentY
                            const blockHeight = sizeScale(n.size)
                            const overlapStart = Math.max(y0, blockY)
                            const overlapEnd = Math.min(y1, blockY + blockHeight)
                            const overlapHeight = Math.max(0, overlapEnd - blockY)
                            const overlapRatio = overlapHeight / blockHeight

                            if (overlapRatio >= 0.5) {
                                selectedCommunities.add(n.community_id)
                            }
                        })

                        // 選択状態を確定
                        selectedCommunities.forEach(id => {
                            if (!useVizStore.getState().selectedCommunities.has(id)) {
                                toggleCommunity(id)
                            }
                        })

                        // ブラシをクリア（安全な処理）
                        const overlay = brushGroup.select('.overlay')
                        if (!overlay.empty()) {
                            overlay.remove()
                        }
                    })

                brushGroup.call(brush)

                currentY += blockHeight + 10
            })
        })

        // 時間軸の描画
        const timeAxis = d3.axisBottom(timeScale)
        svg.append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top + chartHeight})`)
            .call(timeAxis)

        // サイズ軸の描画
        const sizeAxis = d3.axisLeft(sizeScale)
        svg.append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`)
            .call(sizeAxis)

        // 軸ラベルの描画
        svg.append('text')
            .attr('x', margin.left + chartWidth / 2)
            .attr('y', margin.top + chartHeight + margin.bottom - 5)
            .attr('text-anchor', 'middle')
            .attr('fill', '#374151')
            .attr('font-size', '14px')
            .attr('font-weight', '500')
            .text('Time')

        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -(margin.top + chartHeight / 2))
            .attr('y', margin.left - 40)
            .attr('text-anchor', 'middle')
            .attr('fill', '#374151')
            .attr('font-size', '14px')
            .attr('font-weight', '500')
            .text('Size')

    }, [data, selectedCommunities, toggleCommunity])

    // 選択状態の変更時の再描画
    useEffect(() => {
        if (data && svgRef.current) {
            // 選択状態に応じてブロックの表示を更新
            d3.select(svgRef.current).selectAll('.community-block').each(function (this: Element) {
                const element = d3.select(this)
                const communityId = element.attr('data-community')
                if (communityId) {
                    const isSelected = selectedCommunities.has(communityId)
                    element
                        .attr('stroke', isSelected ? '#1F2937' : 'none')
                        .attr('stroke-width', isSelected ? 3 : 0)
                        .attr('opacity', isSelected ? 1 : 0.7)
                }
            })
        }
    }, [selectedCommunities, data])

    if (loading) {
        return (
            <div className="h-96 bg-gray-100 rounded flex items-center justify-center">
                <div className="text-gray-500">Loading Alluvial Chart...</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="h-96 bg-gray-100 rounded flex items-center justify-center">
                <div className="text-red-500">{error}</div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Alluvial View</h2>
            <div ref={containerRef} className="h-96 relative">
                <svg
                    ref={svgRef}
                    width="100%"
                    height="100%"
                    className="alluvial-container"
                />
            </div>
            <div className="mt-4 text-sm text-gray-600">
                <p>• 各時刻スライスで縦方向にドラッグしてコミュニティを選択</p>
                <p>• ブロックをクリックしてコミュニティを選択/選択解除</p>
                <p>• 重なり面積率 ≥ 0.5 で選択判定</p>
            </div>
        </div>
    )
}
