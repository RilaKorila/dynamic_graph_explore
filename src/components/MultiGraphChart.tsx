'use client'

import { useEffect, useState } from 'react'
import { fetchNodes, fetchEdges } from '@/lib/api'
import { Node, Edge } from '@/types'
import SingleGraphChart from './SingleGraphChart'

interface MultiGraphChartProps {
    timestamps?: string[]
}

interface GraphData {
    nodes: Node[]
    edges: Edge[]
}

export default function MultiGraphChart({ timestamps = ['timestamp1', 'timestamp2'] }: MultiGraphChartProps) {
    const [data, setData] = useState<GraphData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

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

    // 各timestampのデータを抽出
    const getDataForTimestamp = (timestamp: string) => {
        if (!data) return { nodes: [], edges: [] }

        const timestampNodes = data.nodes.filter(node => node.time === timestamp)
        const timestampEdges = data.edges.filter(edge => edge.time === timestamp)

        return { nodes: timestampNodes, edges: timestampEdges }
    }

    if (loading) {
        return (
            <div className="h-[500px] bg-gray-100 rounded flex items-center justify-center">
                <div className="text-gray-500">Loading Graphs...</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="h-[500px] bg-gray-100 rounded flex items-center justify-center">
                <div className="text-red-500">{error}</div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Graphs View</h2>

            {/* 横スクロール可能なコンテナ */}
            <div className="overflow-x-auto">
                <div className="flex gap-8 min-w-max pb-4 px-4">
                    {timestamps.map((timestamp) => {
                        const { nodes, edges } = getDataForTimestamp(timestamp)
                        return (
                            <div key={timestamp} className="flex-shrink-0">
                                <SingleGraphChart
                                    timestamp={timestamp}
                                    nodes={nodes}
                                    edges={edges}
                                    title={`Graph ${timestamp}`}
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
