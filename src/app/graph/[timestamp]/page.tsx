'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { Sigma } from 'sigma'
import Graph from 'graphology'
import { fetchNodes, fetchEdges } from '@/lib/api'
import { Node, Edge } from '@/types'
import { getCommunityColor } from '@/lib/colors'

export default function GraphFullScreenPage() {
    const params = useParams()
    const timestamp = params.timestamp as string
    const containerRef = useRef<HTMLDivElement>(null)
    const sigmaRef = useRef<Sigma | null>(null)
    const graphRef = useRef<Graph | null>(null)
    const [data, setData] = useState<{ nodes: Node[], edges: Edge[] } | null>(null)
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

                // 指定されたtimestampのデータのみをフィルタリング
                const filteredNodes = nodes.filter(node => node.time === timestamp)
                const filteredEdges = edges.filter(edge => edge.time === timestamp)

                setData({ nodes: filteredNodes, edges: filteredEdges })
            } catch (err) {
                setError('グラフデータの読み込みに失敗しました')
                console.error('Error loading graph data:', err)
            } finally {
                setLoading(false)
            }
        }

        if (timestamp) {
            loadData()
        }
    }, [timestamp])

    // グラフの構築
    useEffect(() => {
        if (!data || !containerRef.current) return

        // 既存のSigmaインスタンスをクリア
        if (sigmaRef.current) {
            sigmaRef.current.kill()
            sigmaRef.current = null
        }

        // Graphologyグラフの初期化
        const graph = new Graph()
        graphRef.current = graph

        // ノードの追加
        data.nodes.forEach(node => {
            const x = parseFloat(node.x as any) || 0
            const y = parseFloat(node.y as any) || 0

            if (isNaN(x) || isNaN(y)) {
                console.warn(`Invalid coordinates for node ${node.node_id}: x=${node.x}, y=${node.y}`)
                return
            }

            graph.addNode(node.node_id, {
                x: x,
                y: y,
                size: 8,
                label: node.label,
                color: getCommunityColor(node.cluster),
                cluster: node.cluster,
                time: node.time,
                hidden: false,
                highlighted: false
            })
        })

        // エッジの追加
        data.edges.forEach(edge => {
            if (graph.hasNode(edge.src) && graph.hasNode(edge.dst)) {
                graph.addEdge(edge.src, edge.dst, {
                    size: 1,
                    color: '#666',
                    alpha: 0.6
                })
            }
        })

        // Sigma.jsの設定
        const sigma = new Sigma(graph, containerRef.current, {
            renderEdgeLabels: false,
            defaultEdgeColor: '#666',
            defaultNodeColor: '#3B82F6',
            minCameraRatio: 0.1,
            maxCameraRatio: 10,
            labelDensity: 0.07,
            labelGridCellSize: 60,
            labelRenderedSizeThreshold: 6,
            nodeReducer: (_, data) => ({
                ...data,
                hidden: data.hidden || false,
                alpha: data.alpha !== undefined ? data.alpha : 1,
                size: data.size || 8
            }),
            edgeReducer: (_, data) => ({
                ...data,
                hidden: data.hidden || false,
                alpha: data.alpha !== undefined ? data.alpha : 0.6,
                size: data.size || 1
            })
        })

        sigmaRef.current = sigma

        // カメラの自動調整
        sigma.getCamera().setState({
            x: 0,
            y: 0,
            ratio: 1
        })

        // グラフを画面に収める
        sigma.getCamera().animatedReset()

    }, [data])

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-xl text-gray-600">Loading graph...</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-xl text-red-600">{error}</div>
            </div>
        )
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-xl text-gray-600">No data available</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* ヘッダー */}
            <div className="max-w-7xl mx-auto mb-6">
                <div className="flex items-center justify-between bg-white rounded-lg shadow-md p-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            Graph {timestamp}
                        </h1>
                        <div className="mt-2 text-gray-600">
                            {data.nodes.length} nodes • {data.edges.length} edges
                        </div>
                    </div>
                </div>
            </div>

            {/* グラフコンテナ */}
            <div className="max-w-7xl mx-auto">
                <div
                    ref={containerRef}
                    className="w-full h-[calc(100vh-200px)] bg-white rounded-lg shadow-md border"
                />
            </div>
        </div>
    )
}
