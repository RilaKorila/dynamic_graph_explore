'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import Graph from 'graphology'
import Sigma from 'sigma'
import { useVizStore } from '@/store/vizStore'
import { fetchNodes, fetchEdges } from '@/lib/api'
import { Node, Edge } from '@/types'

interface GraphData {
    nodes: Node[]
    edges: Edge[]
}

export default function GraphChart() {
    const containerRef = useRef<HTMLDivElement>(null)
    const sigmaRef = useRef<Sigma | null>(null)
    const graphRef = useRef<Graph | null>(null)
    const [data, setData] = useState<GraphData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const { timeRange, selectedCommunities, currentTime, highlightedNodeIds } = useVizStore()

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

    // コミュニティ → 色のマッピング
    const colorByCommunity = useMemo(() => {
        const palette = [
            '#3B82F6', // blue
            '#10B981', // green
            '#F59E0B', // yellow
            '#EF4444', // red
            '#8B5CF6', // purple
            '#06B6D4', // cyan
            '#F97316', // orange
            '#84CC16', // lime
        ]

        return (communityId: string) => {
            // C<number> 形式のコミュニティIDから色を取得
            const match = communityId.match(/C(\d+)/)
            if (match) {
                const index = parseInt(match[1]) - 1
                return palette[index % palette.length]
            }
            // フォールバック: ハッシュベースの色
            let hash = 0
            for (let i = 0; i < communityId.length; i++) {
                hash = ((hash << 5) - hash) + communityId.charCodeAt(i)
                hash |= 0
            }
            return palette[Math.abs(hash) % palette.length]
        }
    }, [])

    // グラフの初期化と描画
    useEffect(() => {
        if (!data || !containerRef.current) return

        // 既存のSigmaインスタンスをクリア
        if (sigmaRef.current) {
            sigmaRef.current.kill()
            sigmaRef.current = null
        }

        // Graphologyグラフの作成
        const graph = new Graph()
        graphRef.current = graph

        // 現在の時間範囲に基づいてノードとエッジをフィルタリング
        const timeStart = timeRange[0]
        const timeEnd = timeRange[1]

        const filteredNodes = data.nodes.filter(node => {
            const nodeTime = node.time
            return nodeTime >= timeStart && nodeTime <= timeEnd
        })

        const filteredEdges = data.edges.filter(edge => {
            const edgeTime = edge.time
            return edgeTime >= timeStart && edgeTime <= timeEnd
        })

        // ノードの追加
        filteredNodes.forEach(node => {
            // 座標を確実に数値に変換
            const x = parseFloat(node.x as any) || 0
            const y = parseFloat(node.y as any) || 0

            // 座標の妥当性チェック
            if (isNaN(x) || isNaN(y)) {
                console.warn(`Invalid coordinates for node ${node.node_id}: x=${node.x}, y=${node.y}`)
                return // 無効な座標のノードはスキップ
            }

            graph.addNode(node.node_id, {
                x: x,
                y: y,
                size: Math.max(3, Math.min(15, 10 / 20)), // デフォルトサイズを使用
                label: node.label,
                color: colorByCommunity(node.cluster),
                cluster: node.cluster,
                time: node.time,
                // パフォーマンス最適化用の属性
                hidden: false,
                highlighted: false
            })
        })

        // エッジの追加
        filteredEdges.forEach(edge => {
            // 両端のノードが存在する場合のみエッジを追加
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
            // レンダリング設定
            renderEdgeLabels: false, // エッジラベルは非表示（パフォーマンス向上）
            defaultEdgeColor: '#666',
            defaultNodeColor: '#3B82F6',

            // ズーム・パン設定
            minCameraRatio: 0.1,
            maxCameraRatio: 10,

            // パフォーマンス設定
            labelDensity: 0.07,
            labelGridCellSize: 60,
            labelRenderedSizeThreshold: 6
        })

        sigmaRef.current = sigma

        // ノードのホバーイベント
        sigma.on('enterNode', (event) => {
            const node = event.node
            const nodeData = graph.getNodeAttributes(node)

            // ノードをハイライト
            graph.setNodeAttribute(node, 'highlighted', true)
            graph.setNodeAttribute(node, 'size', nodeData.size * 1.5)

            // 関連エッジをハイライト
            graph.forEachEdge((edge, attributes, source, target) => {
                if (source === node || target === node) {
                    graph.setEdgeAttribute(edge, 'color', '#FF6B6B')
                    graph.setEdgeAttribute(edge, 'size', 2)
                }
            })
        })

        sigma.on('leaveNode', (event) => {
            const node = event.node
            const nodeData = graph.getNodeAttributes(node)

            // ノードのハイライトを解除
            graph.setNodeAttribute(node, 'highlighted', false)
            graph.setNodeAttribute(node, 'size', nodeData.size)

            // 関連エッジのハイライトを解除
            graph.forEachEdge((edge, attributes, source, target) => {
                if (source === node || target === node) {
                    graph.setEdgeAttribute(edge, 'color', '#666')
                    graph.setEdgeAttribute(edge, 'size', 1)
                }
            })
        })

        // ノードのクリックイベント
        sigma.on('clickNode', (event) => {
            const node = event.node

            // ノードのハイライト状態を切り替え（サイズは変更しない）
            const currentHighlighted = highlightedNodeIds.has(node)
            if (currentHighlighted) {
                useVizStore.getState().toggleHighlightedNode(node)
            } else {
                useVizStore.getState().toggleHighlightedNode(node)
            }
        })

        // カメラの自動調整
        sigma.getCamera().setState({
            x: 0,
            y: 0,
            ratio: 1
        })

        // グラフを画面に収める
        sigma.getCamera().animatedReset()

    }, [data, timeRange, colorByCommunity])

    // 選択状態の変更時の表示更新
    useEffect(() => {
        if (!graphRef.current || !sigmaRef.current) return

        const graph = graphRef.current

        // ユーザアクションによる透明度の違いを定義
        const SELECTED_ALPHA = 1
        const HIGHLIGHTED_ALPHA = 1
        const UNSELECTED_ALPHA = 0.3

        // ノードサイズを定義
        const ORIGINAL_NODE_SIZE = Math.max(3, Math.min(15, 10 / 20)) // デフォルトサイズ
        const SELECTED_NODE_SIZE = ORIGINAL_NODE_SIZE * 1.2
        const UNSELECTED_NODE_SIZE = ORIGINAL_NODE_SIZE
        const HIGHLIGHTED_NODE_SIZE = ORIGINAL_NODE_SIZE * 1.5

        // エッジサイズを定義
        const ORIGINAL_EDGE_SIZE = 1
        const SELECTED_EDGE_SIZE = ORIGINAL_EDGE_SIZE * 2
        const UNSELECTED_EDGE_SIZE = ORIGINAL_EDGE_SIZE * 0.5

        // 選択されたコミュニティに基づいてノードの表示を更新
        graph.forEachNode((node, attributes) => {
            const isSelected = selectedCommunities.has(attributes.cluster)
            const isHighlighted = highlightedNodeIds.has(node)

            // 選択状態に応じてノードの表示を調整
            if (selectedCommunities.size === 0) {
                // 何も選択されていない場合：全ノードを表示
                graph.setNodeAttribute(node, 'hidden', false)
                graph.setNodeAttribute(node, 'alpha', UNSELECTED_ALPHA)
                graph.setNodeAttribute(node, 'size', UNSELECTED_NODE_SIZE)
            } else if (isSelected) {
                // 選択されたコミュニティ：強調表示
                graph.setNodeAttribute(node, 'hidden', false)
                graph.setNodeAttribute(node, 'alpha', SELECTED_ALPHA)
                graph.setNodeAttribute(node, 'size', SELECTED_NODE_SIZE)
            } else {
                // 非選択のコミュニティ：フェード
                graph.setNodeAttribute(node, 'hidden', false)
                graph.setNodeAttribute(node, 'alpha', UNSELECTED_ALPHA)
                graph.setNodeAttribute(node, 'size', UNSELECTED_NODE_SIZE)
            }

            // ハイライト状態の更新（サイズは元のサイズを基準に）
            if (isHighlighted) {
                graph.setNodeAttribute(node, 'size', HIGHLIGHTED_NODE_SIZE)
                graph.setNodeAttribute(node, 'alpha', HIGHLIGHTED_ALPHA)
            } else {
                graph.setNodeAttribute(node, 'color', colorByCommunity(attributes.cluster))
            }
        })

        // エッジの表示も更新
        graph.forEachEdge((edge, attributes, source, target) => {
            const sourceAttrs = graph.getNodeAttributes(source)
            const targetAttrs = graph.getNodeAttributes(target)

            if (selectedCommunities.size === 0) {
                // 全エッジを表示
                graph.setEdgeAttribute(edge, 'hidden', false)
                graph.setEdgeAttribute(edge, 'alpha', UNSELECTED_ALPHA)
            } else if (selectedCommunities.has(sourceAttrs.cluster) && selectedCommunities.has(targetAttrs.cluster)) {
                // 選択されたコミュニティ間のエッジ：強調
                graph.setEdgeAttribute(edge, 'hidden', false)
                graph.setEdgeAttribute(edge, 'alpha', SELECTED_ALPHA)
                graph.setEdgeAttribute(edge, 'size', SELECTED_EDGE_SIZE)
            } else {
                // 非選択のエッジ：フェード
                graph.setEdgeAttribute(edge, 'hidden', false)
                graph.setEdgeAttribute(edge, 'alpha', UNSELECTED_ALPHA)
                graph.setEdgeAttribute(edge, 'size', UNSELECTED_EDGE_SIZE)
            }
        })

    }, [selectedCommunities, highlightedNodeIds, colorByCommunity])

    // 現在の時刻の変更時の表示更新
    useEffect(() => {
        if (!graphRef.current || !sigmaRef.current) return

        const graph = graphRef.current

        // 現在の時刻に基づいてノードの表示を更新
        graph.forEachNode((node, attributes) => {
            const isCurrentTime = attributes.time === currentTime

            if (isCurrentTime) {
                // 現在の時刻のノード：通常表示
                graph.setNodeAttribute(node, 'alpha', 1)
                graph.setNodeAttribute(node, 'size', attributes.size)
            } else {
                // 過去の時刻のノード：フェード
                graph.setNodeAttribute(node, 'alpha', 0.5)
                graph.setNodeAttribute(node, 'size', attributes.size * 0.8)
            }
        })

    }, [currentTime])

    if (loading) {
        return (
            <div className="h-96 bg-gray-100 rounded flex items-center justify-center">
                <div className="text-gray-500">Loading Graph...</div>
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
            <h2 className="text-xl font-semibold mb-4">Graph View</h2>
            <div ref={containerRef} className="h-96 relative bg-gray-50 rounded border">
                {/* グラフの統計情報 */}
                <div className="absolute top-2 left-2 bg-white bg-opacity-90 rounded px-2 py-1 text-xs text-gray-600">
                    {data && (
                        <>
                            Nodes: {data.nodes.length} |
                            Edges: {data.edges.length} |
                            Time: {currentTime}
                        </>
                    )}
                </div>

                {/* 操作説明 */}
                <div className="absolute bottom-2 left-2 bg-white bg-opacity-90 rounded px-2 py-1 text-xs text-gray-600">
                    <div>🖱️ Hover: Highlight | 🖱️ Click: Select | 🔍 Scroll: Zoom</div>
                </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
                <ul className="list-disc list-inside">
                    <li>ノードをホバーして関連エッジをハイライト</li>
                    <li>ノードをクリックして選択状態を切り替え</li>
                    <li>スクロールでズーム、ドラッグでパン</li>
                    <li>時間範囲とコミュニティ選択に応じて表示が更新</li>
                </ul>
            </div>
        </div>
    )
}
