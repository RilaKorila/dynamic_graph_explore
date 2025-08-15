'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import * as d3 from 'd3'
import { useVizStore } from '@/store/vizStore'
import { fetchAlluvialNodes, fetchAlluvialLinks } from '@/lib/api'
import { AlluvialNode, AlluvialLink, AlluvialBlock } from '@/types'
import { getCommunityColor, getUniqueCommunityIds } from '@/lib/colors'


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

    const {
        selectedCommunities,
        toggleCommunity,
        setSelectedCommunities,
        timeRange,
        setBrush,
        currentTime,
        setCurrentTime,
        highlightedNodeIds,
        communityColors,
        initializeCommunityColors
    } = useVizStore()

    // データの取得
    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true)
                const [nodes, links] = await Promise.all([
                    fetchAlluvialNodes(),
                    fetchAlluvialLinks() // FIXME: link不要かもしれない
                ])
                setData({ nodes, links })

                // コミュニティの色マッピングを初期化
                const uniqueCommunityIds = getUniqueCommunityIds(nodes)
                initializeCommunityColors(uniqueCommunityIds)
            } catch (err) {
                setError('データの読み込みに失敗しました')
                console.error('Error loading alluvial data:', err)
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [initializeCommunityColors])

    // コミュニティIDから色を取得
    const colorByCommunity = useMemo(() => {
        return (communityId: string) => {
            return communityColors.get(communityId) || getCommunityColor(communityId)
        }
    }, [communityColors])

    // ハイライトされたノードのコミュニティを取得
    const highlightedCommunities = useMemo(() => {
        if (!data || highlightedNodeIds.size === 0) return new Set<string>()

        // AlluvialNodeにはnode_idがないため、GraphChartから取得したノードデータを使用
        // この実装では、GraphChartのノード選択状態を直接反映できないため、
        // 一時的に空のセットを返す（後でGraphChartとの連携を実装）
        return new Set<string>()
    }, [data, highlightedNodeIds])

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

        svg.attr('viewBox', `0 0 ${width} ${height}`)

        // 時間軸の設定
        const times = Array.from(new Set(data.nodes.map(d => d.time))).sort()
        const byTime = d3.group(data.nodes, d => d.time)

        const timeScale = d3.scaleBand<string>()
            .domain(times)
            .range([0, chartWidth])
            .padding(0.1)

        // ---- 縦スケール（絶対値モード）----
        const totals = new Map(times.map(t => [t, d3.sum(byTime.get(t) ?? [], d => Number(d.size))]))
        const maxTotal = d3.max(totals.values()) ?? 0

        // 各スライス内のブロック間ギャップ（px）
        const gap = 1

        // 列ごとの y0/y1 を前計算
        const layoutByTime = new Map<string, AlluvialBlock[]>()
        times.forEach(time => {
            // sizeが大きい順にソート（上から並べる）
            const slice = (byTime.get(time) ?? []).slice()
                .sort((a, b) => d3.descending(Number(a.size), Number(b.size)))
            const count = slice.length
            const available = chartHeight - gap * Math.max(0, count - 1)
            const yScale = d3.scaleLinear()
                .domain([0, maxTotal]) // 絶対値比較：全列同一スケール
                .range([0, available])

            let acc = 0
            const blocks: AlluvialBlock[] = []
            slice.forEach((n, i) => {
                const h = yScale(n.size)
                const y0 = margin.top + yScale(acc) + i * gap // gap を積み上げに反映
                const y1 = y0 + h
                blocks.push({ ...n, y0, y1 })
                acc += Number(n.size)
            })
            layoutByTime.set(time, blocks)
        })

        // 各スライスを描画
        times.forEach(time => {
            const bandwidth = timeScale.bandwidth()

            const blocks = layoutByTime.get(time) ?? []

            // スライス用 <g>
            const sliceG = svg.append('g')
                .attr('class', `slice-${time}`)
                .attr('transform', `translate(${(timeScale(time) ?? 0) + margin.left},0)`)

            // 時間軸の背景（クリック可能）
            sliceG.append('rect')
                .attr('class', 'time-background')
                .attr('x', 0)
                .attr('y', margin.top + chartHeight)
                .attr('width', bandwidth)
                .attr('height', 20)
                .attr('fill', timeRange.includes(time) ? '#E5E7EB' : 'transparent')
                .attr('stroke', timeRange.includes(time) ? '#6B7280' : 'none')
                .attr('stroke-width', timeRange.includes(time) ? 2 : 0)
                .style('cursor', 'pointer')
                .on('click', (event) => {
                    // 時間範囲の選択（Shift+クリックで範囲拡張）
                    if (event.shiftKey) {
                        // Shift+クリック：時間範囲を拡張
                        const currentRange = useVizStore.getState().timeRange
                        let newTimeRange: [string, string]

                        if (time < currentRange[0]) {
                            newTimeRange = [time, currentRange[1]]
                        } else if (time > currentRange[1]) {
                            newTimeRange = [currentRange[0], time]
                        } else {
                            // 範囲内の場合は単一時間に設定
                            newTimeRange = [time, time]
                        }
                        setBrush(newTimeRange)
                    } else {
                        // 通常クリック：単一時間に設定
                        const newTimeRange: [string, string] = [time, time]
                        setBrush(newTimeRange)
                    }
                    setCurrentTime(time)
                })

            // ブロックの最小高さ
            const MIN_BLOCK_PX = 1

            // ブロック（sizeが大きい順に上から配置）
            sliceG.selectAll('rect.comm-rect')
                .data(blocks, (d: any) => d.community_id) // (time, community_id) がユニーク前提
                .join('rect')
                .attr('class', 'comm-rect')
                .attr('data-community', (d: AlluvialBlock) => d.community_id)
                .attr('data-time', time)
                .attr('x', bandwidth * 0.2) // 横位置は帯域の中に寄せる
                .attr('width', bandwidth * 0.6) // 横幅は一定（Alluvialノードの箱）
                .attr('y', (d: AlluvialBlock) => d.y0)
                .attr('height', (d: AlluvialBlock) => Math.max(MIN_BLOCK_PX, d.y1 - d.y0))
                .attr('fill', (d: AlluvialBlock) => colorByCommunity(d.community_id))
                .attr('stroke', (d: AlluvialBlock) => {
                    if (selectedCommunities.has(d.community_id)) return '#1F2937'
                    if (highlightedCommunities.has(d.community_id)) return '#FF6B6B'
                    return 'none'
                })
                .attr('stroke-width', (d: AlluvialBlock) => {
                    if (selectedCommunities.has(d.community_id)) return 3
                    if (highlightedCommunities.has(d.community_id)) return 2
                    return 0
                })
                .attr('opacity', (d: AlluvialBlock) => {
                    if (selectedCommunities.size === 0) return 1
                    if (selectedCommunities.has(d.community_id)) return 1
                    if (highlightedCommunities.has(d.community_id)) return 0.8
                    return 0.35
                })
                .style('cursor', 'pointer')
                .on('click', (_, d: AlluvialBlock) => {
                    toggleCommunity(d.community_id)
                })

            // ラベル（中央）
            sliceG.selectAll('text.community-label')
                .data(blocks, (d: any) => d.community_id)
                .join('text')
                .attr('class', 'community-label')
                .attr('x', bandwidth * 0.5)
                .attr('y', (d: AlluvialBlock) => (d.y0 + d.y1) / 2)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('fill', '#374151')
                .attr('font-size', 11)
                .attr('font-weight', 500)
                .text((d: AlluvialBlock) => `${d.community_id}: ${d.size}`)
                .style('opacity', (d: AlluvialBlock) => { // Communityの高さが足りない場合はラベルを非表示
                    const blockHeight = d.y1 - d.y0
                    const MIN_LABEL_HEIGHT = 8  // ラベルを表示する最小高さ
                    return blockHeight >= MIN_LABEL_HEIGHT ? 1 : 0  // 高さが足りない場合は非表示
                })

            // ブラシイベントの設定（スライスごとに1つ）
            const brush = d3.brushY()
                .extent([[0, margin.top], [bandwidth, margin.top + chartHeight]])
                .on('brush', (ev: d3.D3BrushEvent<unknown>) => {
                    // プログラムによる move(null) のイベントは無視
                    if (!ev.sourceEvent) return;

                    const sel = ev.selection as [number, number] | null
                    const hit = new Set<string>()
                    if (sel) {
                        const b0 = Math.min(sel[0], sel[1])
                        const b1 = Math.max(sel[0], sel[1])
                        blocks.forEach(n => {
                            const overlap = Math.max(0, Math.min(b1, n.y1) - Math.max(b0, n.y0))
                            const ratio = overlap / Math.max(1, (n.y1 - n.y0))
                            if (ratio >= 0.5) hit.add(n.community_id)
                        })
                    }
                    // 一時ハイライト（フェードのみ）
                    sliceG.selectAll<SVGRectElement, AlluvialBlock>('rect.comm-rect')
                        .attr('opacity', d => (selectedCommunities.size === 0 && !sel)
                            ? 1
                            : (sel ? (hit.has(d.community_id) ? 1 : 0.15)
                                : (selectedCommunities.has(d.community_id) ? 1 : 0.35)))
                })
                .on('end', (ev: d3.D3BrushEvent<unknown>) => {
                    //　プログラムによる clear での end を無視
                    if (!ev.sourceEvent) return;

                    const selected = ev.selection as [number, number] | null
                    const hit = new Set<string>()
                    if (selected) {
                        const b0 = Math.min(selected[0], selected[1])
                        const b1 = Math.max(selected[0], selected[1])
                        blocks.forEach(n => {
                            const overlap = Math.max(0, Math.min(b1, n.y1) - Math.max(b0, n.y0))
                            const ratio = overlap / Math.max(1, (n.y1 - n.y0))
                            if (ratio >= 0.5) hit.add(n.community_id)
                        })
                    }
                    // Shift 加算 / 通常は置換
                    const current = useVizStore.getState().selectedCommunities;
                    let next: Set<string>;
                    if (ev.sourceEvent && (ev.sourceEvent as any).shiftKey) {
                        next = new Set<string>();
                        current.forEach((v: string) => next.add(v));
                        hit.forEach((v: string) => next.add(v));
                    } else {
                        next = hit;
                    }
                    setSelectedCommunities(next);

                    // ブラシ解除
                    d3.select<SVGGElement, unknown>(sliceG.select('.ybrush').node() as any)
                        ; (brush.move as any)(sliceG.select<SVGGElement>('.ybrush'), null)
                })

            sliceG.append('g').attr('class', 'ybrush').call(brush)
        })

        // 時間軸の描画
        const timeAxis = d3.axisBottom(timeScale)
        svg.append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top + chartHeight})`)
            .call(timeAxis)

        // 左軸：絶対値（上小・下大になるように反転）
        const sizeAxisScale = d3.scaleLinear()
            .domain([0, maxTotal])
            .range([margin.top + chartHeight, margin.top])
        const sizeAxis = d3.axisLeft(sizeAxisScale)
        svg.append('g')
            .attr('transform', `translate(${margin.left}, 0)`)
            .call(sizeAxis)

        // 軸ラベルの描画
        svg.append('text')
            .attr('x', margin.left + chartWidth / 2)
            .attr('y', margin.top + chartHeight + margin.bottom - 10)
            .attr('text-anchor', 'middle')
            .attr('fill', '#374151')
            .attr('font-size', 14)
            .attr('font-weight', 500)
            .text('Time')

        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -(margin.top + chartHeight / 2))
            .attr('y', margin.left - 40)
            .attr('text-anchor', 'middle')
            .attr('fill', '#374151')
            .attr('font-size', 14)
            .attr('font-weight', 500)
            .text('Size')

    }, [data, timeRange, currentTime, highlightedCommunities]) // 依存関係を更新

    // 選択状態が変わったらスタイルだけ更新（再レイアウトしない）
    useEffect(() => {
        if (!svgRef.current) return

        const svg = d3.select(svgRef.current)

        // コミュニティ選択状態の更新
        svg.selectAll<SVGRectElement, any>('rect.comm-rect')
            .attr('stroke', function (d: any) {
                const cid = d3.select(this).attr('data-community')!
                if (selectedCommunities.has(cid)) return '#1F2937'
                if (highlightedCommunities.has(cid)) return '#FF6B6B'
                return 'none'
            })
            .attr('stroke-width', function (d: any) {
                const cid = d3.select(this).attr('data-community')!
                if (selectedCommunities.has(cid)) return 3
                if (highlightedCommunities.has(cid)) return 2
                return 0
            })
            .attr('opacity', function () {
                const cid = d3.select(this).attr('data-community')!
                if (selectedCommunities.size === 0) return 1
                if (selectedCommunities.has(cid)) return 1
                if (highlightedCommunities.has(cid)) return 0.8
                return 0.35
            })

        // 時間範囲選択状態の更新
        svg.selectAll<SVGRectElement, any>('rect.time-background')
            .attr('fill', function (d: any) {
                const parentElement = this.parentElement
                if (!parentElement) return 'transparent'
                const time = parentElement.getAttribute('class')?.replace('slice-', '')

                // 選択された時間範囲内かどうかをチェック
                if (time && timeRange.includes(time)) {
                    if (time === timeRange[0] && time === timeRange[1]) {
                        return '#3B82F6'  // 単一時間選択（青色で強調）
                    } else {
                        return '#E5E7EB'  // 選択された時間範囲
                    }
                } else {
                    return 'transparent'  // 非選択
                }
            })
            .attr('stroke', function (d: any) {
                const parentElement = this.parentElement
                if (!parentElement) return 'none'
                const time = parentElement.getAttribute('class')?.replace('slice-', '')

                if (time && timeRange.includes(time)) {
                    if (time === timeRange[0] && time === timeRange[1]) {
                        return '#1D4ED8'  // 単一時間選択（濃い青色）
                    } else {
                        return '#6B7280'  // 範囲選択（グレー）
                    }
                }
                return 'none'
            })
            .attr('stroke-width', function (d: any) {
                const parentElement = this.parentElement
                if (!parentElement) return 0
                const time = parentElement.getAttribute('class')?.replace('slice-', '')

                if (time && timeRange.includes(time)) {
                    if (time === timeRange[0] && time === timeRange[1]) {
                        return 3  // 単一時間選択（太い線）
                    } else {
                        return 2  // 範囲選択（普通の線）
                    }
                }
                return 0
            })

    }, [selectedCommunities, highlightedCommunities, timeRange])

    if (loading) {
        return (
            <div className="h-[600px] bg-gray-100 rounded flex items-center justify-center">
                <div className="text-gray-500">Loading Alluvial Chart...</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="h-[600px] bg-gray-100 rounded flex items-center justify-center">
                <div className="text-red-500">{error}</div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Alluvial View</h2>
            <div ref={containerRef} className="h-[600px] relative">
                <svg
                    ref={svgRef}
                    width="100%"
                    height="100%"
                    className="alluvial-container"
                />
            </div>
        </div>
    )
}
