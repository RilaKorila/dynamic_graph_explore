'use client'

import { useEffect, useState, useRef } from 'react'
import { useVizStore } from '@/store/vizStore'
import { useDynamicCommunityStore } from '@/store/dynamicCommunityStore'
import { fetchNodes, fetchEdges } from '@/lib/api'
import { Node, Edge } from '@/types'
import SingleGraphChart from './SingleGraphChart'


interface GraphData {
    nodes: Node[]
    edges: Edge[]
}

export default function MultiGraphChart() {
    const { timeRange } = useVizStore()  // timeRangeを取得
    const { timestamps: storeTimestamps } = useDynamicCommunityStore()  // storeからtimestampsを取得
    const [data, setData] = useState<GraphData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    // storeから取得したtimestampsを使用
    const effectiveTimestamps = storeTimestamps

    // データの取得
    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true)
                const [nodes, edges] = await Promise.all([
                    fetchNodes(),
                    fetchEdges()
                ])
                setData({ nodes, edges })
            } catch (err) {
                setError('グラフデータの読み込みに失敗しました')
                console.error('Error loading graph data:', err)
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [])

    // 選択されたtimestampに自動スクロール
    useEffect(() => {
        if (scrollContainerRef.current && effectiveTimestamps && timeRange[0] === timeRange[1]) {
            const selectedTimestamp = timeRange[0]
            const timestampIndex = effectiveTimestamps.indexOf(selectedTimestamp)

            if (timestampIndex !== -1) {
                const container = scrollContainerRef.current
                const scrollWidth = container.scrollWidth
                const containerWidth = container.clientWidth
                const scrollPosition = (timestampIndex / (effectiveTimestamps.length - 1)) * (scrollWidth - containerWidth)

                container.scrollTo({
                    left: scrollPosition,
                    behavior: 'smooth'
                })
            }
        }
    }, [timeRange, effectiveTimestamps])

    // 各timestampのデータを抽出
    const getDataForTimestamp = (timestamp: string) => {
        if (!data) return { nodes: [], edges: [] }

        const timestampNodes = data.nodes.filter(node => node.time === timestamp)
        const timestampEdges = data.edges.filter(edge => edge.time === timestamp)

        return { nodes: timestampNodes, edges: timestampEdges }
    }

    if (loading) {
        return (
            <div className="h-[800px] bg-gray-100 rounded flex items-center justify-center">
                <div className="text-gray-500">Loading Graphs...</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="h-[800px] bg-gray-100 rounded flex items-center justify-center">
                <div className="text-red-500">{error}</div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-lg shadow-md p-6">

            {/* 横スクロール可能なコンテナ */}
            <div className="overflow-x-auto" ref={scrollContainerRef}>
                <div className="flex gap-8 min-w-max pb-4 px-4">
                    {effectiveTimestamps.map((timestamp) => {
                        const { nodes, edges } = getDataForTimestamp(timestamp)
                        const isSelected = timeRange.includes(timestamp)
                        const isSingleSelection = timeRange[0] === timestamp && timeRange[1] === timestamp

                        return (
                            <div
                                key={timestamp}
                                className={`flex-shrink-0 transition-all duration-200 ${isSelected
                                    ? isSingleSelection
                                        ? 'ring-4 ring-blue-500 ring-opacity-50'
                                        : 'ring-2 ring-blue-300 ring-opacity-30'
                                    : 'ring-1 ring-gray-200'
                                    }`}
                            >
                                <SingleGraphChart
                                    timestamp={timestamp}
                                    nodes={nodes}
                                    edges={edges}
                                    title={`Graph ${timestamp}`}
                                    isHighlighted={isSelected}
                                    highlightLevel={isSingleSelection ? 'strong' : 'weak'}
                                />
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* スクロールインジケーター */}
            <div className="mt-4 text-sm text-gray-500 text-center">
                ← 横スクロールで他のtimestampのグラフを表示 →
            </div>
        </div>
    )
}
