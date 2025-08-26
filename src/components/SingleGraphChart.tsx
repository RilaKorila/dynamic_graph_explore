'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Graph from 'graphology'
import Sigma from 'sigma'
import { SquareArrowUpRight } from 'lucide-react'
import { useVizStore } from '@/store/vizStore'
import { Node, Edge } from '@/types'
import { getCommunityColor } from '@/lib/colors'

interface SingleGraphChartProps {
    timestamp: string
    nodes: Node[]
    edges: Edge[]
    title?: string
    isHighlighted?: boolean
    highlightLevel?: 'strong' | 'weak'
}

interface GraphData {
    nodes: Node[]
    edges: Edge[]
}

export default function SingleGraphChart({
    timestamp,
    nodes,
    edges,
    isHighlighted = false,
    highlightLevel = 'weak'
}: SingleGraphChartProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const sigmaRef = useRef<Sigma | null>(null)
    const graphRef = useRef<Graph | null>(null)
    const [data, setData] = useState<GraphData | null>(null)

    const { selectedCommunities, highlightedNodeIds } = useVizStore()

    // colorByCommunity関数をuseCallbackで最適化
    const colorByCommunity = useCallback((communityId: string) => {
        return getCommunityColor(communityId)
    }, [])

    // データの設定
    useEffect(() => {
        setData({ nodes, edges })
    }, [nodes, edges])

    // データが変更されたときにグラフを構築
    useEffect(() => {
        if (!data || !containerRef.current) return

        // コンテナのサイズをチェック
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            // コンテナサイズが0の場合は少し待ってから再試行
            setTimeout(() => {
                if (containerRef.current && data) {
                    const graph = new Graph()
                    graphRef.current = graph
                    buildGraph(graph, data.nodes, data.edges)
                }
            }, 100);
            return;
        }

        // 既存のSigmaインスタンスをクリア
        if (sigmaRef.current) {
            sigmaRef.current.kill()
            sigmaRef.current = null
        }

        // Graphologyグラフの初期化
        const graph = new Graph()
        graphRef.current = graph

        // 指定されたtimestampのデータでグラフを構築
        buildGraph(graph, data.nodes, data.edges)

    }, [data])

    // グラフ構築のヘルパー関数
    const buildGraph = (graph: Graph, nodes: Node[], edges: Edge[]) => {
        // ノードの追加
        nodes.forEach(node => {
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
        edges.forEach(edge => {
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
        const sigma = new Sigma(graph, containerRef.current!, {
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
            labelRenderedSizeThreshold: 6,

            // コンテナエラーを防ぐ設定
            allowInvalidContainer: true,

            // ノードの表示制御設定
            nodeReducer: (_, data) => ({
                ...data,
                hidden: data.hidden || false,
                alpha: data.alpha !== undefined ? data.alpha : 1,
                size: data.size || 3
            }),

            // エッジの表示制御設定
            edgeReducer: (_, data) => ({
                ...data,
                hidden: data.hidden || false,
                alpha: data.alpha !== undefined ? data.alpha : 0.6,
                size: data.size || 1
            })
        })

        sigmaRef.current = sigma

        // コンテナのサイズ変更を監視してSigma.jsをリサイズ
        const resizeObserver = new ResizeObserver(() => {
            if (sigma && containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    sigma.resize();
                }
            }
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        // クリーンアップ時にResizeObserverを切断
        sigma.on('kill', () => {
            resizeObserver.disconnect();
        });

        // ノードのホバーイベント
        sigma.on('enterNode', (event) => {
            const node = event.node
            const nodeData = graph.getNodeAttributes(node)

            // ノードをハイライト
            graph.setNodeAttribute(node, 'highlighted', true)

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
            const nodeData = graph.getNodeAttributes(node)

            // ノードのハイライト状態を切り替え
            const currentHighlighted = highlightedNodeIds.has(node)
            if (currentHighlighted) {
                useVizStore.getState().toggleHighlightedNode(node)
            } else {
                useVizStore.getState().toggleHighlightedNode(node)
            }

            // 選択されたノードのコミュニティを一時的にハイライト
            if (!currentHighlighted) {
                // 他のノードのハイライトをクリアして、選択されたノードのみハイライト
                graph.forEachNode((n, attrs) => {
                    if (n !== node) {
                        graph.setNodeAttribute(n, 'highlighted', false)
                    }
                })

                // 選択されたノードのコミュニティを一時的に選択状態に追加
                const currentSelected = useVizStore.getState().selectedCommunities
                if (!currentSelected.has(nodeData.cluster)) {
                    const newSelected = new Set(currentSelected)
                    newSelected.add(nodeData.cluster)
                    useVizStore.getState().setSelectedCommunities(newSelected)
                }
            } else {
                // ハイライト解除時は、そのノードのコミュニティの選択も解除
                const currentSelected = useVizStore.getState().selectedCommunities
                if (currentSelected.has(nodeData.cluster)) {
                    const newSelected = new Set(currentSelected)
                    newSelected.delete(nodeData.cluster)
                    useVizStore.getState().setSelectedCommunities(newSelected)
                }
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

        // 初期フィルタリング処理を実行
        applyFilters(graph, sigma)
    }

    // フィルタリング処理を適用する関数
    const applyFilters = (graph: Graph, sigma: Sigma) => {
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
                // 選択されたコミュニティ：表示・強調
                graph.setNodeAttribute(node, 'hidden', false)
                graph.setNodeAttribute(node, 'alpha', SELECTED_ALPHA)
                graph.setNodeAttribute(node, 'size', SELECTED_NODE_SIZE)
            } else {
                // 非選択のコミュニティ：非表示
                graph.setNodeAttribute(node, 'hidden', true)
                graph.setNodeAttribute(node, 'alpha', 0)
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
                // 選択されたコミュニティ間のエッジ：表示・強調
                graph.setEdgeAttribute(edge, 'hidden', false)
                graph.setEdgeAttribute(edge, 'alpha', SELECTED_ALPHA)
                graph.setEdgeAttribute(edge, 'size', SELECTED_EDGE_SIZE)
            } else {
                // 非選択のエッジ：非表示
                graph.setEdgeAttribute(edge, 'hidden', true)
                graph.setEdgeAttribute(edge, 'alpha', 0)
                graph.setEdgeAttribute(edge, 'size', UNSELECTED_EDGE_SIZE)
            }
        })

        // Sigma.jsの再描画を強制
        sigma.refresh()
    }

    // // 選択状態の変更時の表示更新（独立したuseEffect）
    useEffect(() => {
        if (!graphRef.current || !sigmaRef.current) return

        const graph = graphRef.current
        const sigma = sigmaRef.current

        // フィルタリング処理を適用
        applyFilters(graph, sigma)


    }, [selectedCommunities, highlightedNodeIds, colorByCommunity])

    // 別タブで大画面表示する関数
    const openInNewTab = () => {
        // Next.jsの動的ルートを使用
        const url = `/graph/${timestamp}`
        window.open(url, '_blank')
    }

    if (!data) {
        return (
            <div className="h-[400px] bg-gray-100 rounded flex items-center justify-center">
                <div className="text-gray-500">No data for {timestamp}</div>
            </div>
        )
    }

    return (
        <div className={`bg-white rounded-lg shadow-md p-4 transition-all duration-200 ${isHighlighted
            ? highlightLevel === 'strong'
                ? 'bg-blue-50 border-2 border-blue-500'
                : 'bg-blue-25 border border-blue-300'
            : 'border border-gray-200'
            }`}>
            <div className={`flex items-center justify-between mb-3`}>
                <h3 className={`text-lg font-semibold ${isHighlighted ? 'text-blue-700' : 'text-gray-900'}`}>
                    {`Graph ${timestamp}`}
                    {isHighlighted && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {highlightLevel === 'strong' ? 'Selected' : 'In Range'}
                        </span>
                    )}
                </h3>
                <button
                    onClick={openInNewTab}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
                    title="Open in new tab (full screen)"
                >
                    <SquareArrowUpRight className="h-4 w-4" />
                </button>
            </div>
            <div ref={containerRef} className="h-[400px] w-[500px] relative bg-gray-50 rounded border">
                {/* グラフの統計情報 */}
                <div className="absolute top-2 left-2 bg-white bg-opacity-90 rounded px-2 py-1 text-xs text-gray-600">
                    {graphRef.current && (
                        <>
                            Nodes: {(() => {
                                let count = 0
                                graphRef.current!.forEachNode((node, attrs) => {
                                    if (!attrs.hidden) count++
                                })
                                return count
                            })()} |
                            Edges: {(() => {
                                let count = 0
                                graphRef.current!.forEachEdge((edge, attrs) => {
                                    if (!attrs.hidden) count++
                                })
                                return count
                            })()} |
                            Time: {timestamp}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
