'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import * as d3 from 'd3'
import { useVizStore } from '@/store/vizStore'
import { fetchAlluvialNodes, fetchAlluvialLinks } from '@/lib/api'
import { AlluvialNode, AlluvialLink, AlluvialBlock } from '@/types'


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

    const { selectedCommunities, toggleCommunity, setSelectedCommunities } = useVizStore()

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

    // コミュニティ → 色
    const colorByCommunity = useMemo(() => {
        const palette = d3.schemeTableau10
        return (cid: string) => {
            // C<number> 想定だが、任意の文字列もOK
            const m = cid.match(/\d+/)?.[0]

            // d3.hashCode は存在しないので自前でハッシュ関数を定義
            function simpleHash(str: string): number {
                let hash = 0
                for (let i = 0; i < str.length; i++) {
                    hash = ((hash << 5) - hash) + str.charCodeAt(i)
                    hash |= 0 // 32ビット整数に変換
                }
                return hash
            }
            const idx = m ? (+m % palette.length) : Math.abs(simpleHash(cid)) % palette.length
            return palette[idx]
        }
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

        svg.attr('viewBox', `0 0 ${width} ${height}`)

        // 時間軸の設定
        const times = Array.from(new Set(data.nodes.map(d => d.time))).sort()
        const byTime = d3.group(data.nodes, d => d.time)

        const timeScale = d3.scaleBand<string>()
            .domain(times)
            .range([0, chartWidth])
            .padding(0.1)

        // ---- 縦スケール（絶対値モード）----
        const totals = new Map(times.map(t => [t, d3.sum(byTime.get(t) ?? [], d => +d.size)]))
        const maxTotal = d3.max(totals.values()) ?? 0

        // 各スライス内のブロック間ギャップ（px）
        const gap = 8

        // 列ごとの y0/y1 を前計算
        const layoutByTime = new Map<string, AlluvialBlock[]>()
        times.forEach(time => {
            const slice = (byTime.get(time) ?? []).slice()
                .sort((a, b) => d3.descending(a.size, b.size)) // 並びは任意の固定ルール
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
                acc += n.size
            })
            layoutByTime.set(time, blocks)
        })

        // 各スライスを描画
        times.forEach(time => {
            const x0 = (timeScale(time) ?? 0) + margin.left
            const bandwidth = timeScale.bandwidth()

            const blocks = layoutByTime.get(time) ?? []

            // スライス用 <g>
            const sliceG = svg.append('g')
                .attr('class', `slice-${time}`)
                .attr('transform', `translate(${(timeScale(time) ?? 0) + margin.left},0)`)

            // ブロック
            sliceG.selectAll('rect.comm-rect')
                .data(blocks, (d: any) => d.community_id) // (time, community_id) がユニーク前提
                .join('rect')
                .attr('class', 'comm-rect')
                .attr('data-community', (d: AlluvialBlock) => d.community_id)
                .attr('data-time', time)
                .attr('x', bandwidth * 0.2) // 横位置は帯域の中に寄せる
                .attr('width', bandwidth * 0.6) // 横幅は一定（Alluvialノードの箱）
                .attr('y', (d: AlluvialBlock) => d.y0)
                .attr('height', (d: AlluvialBlock) => Math.max(1, d.y1 - d.y0))
                .attr('fill', (d: AlluvialBlock) => colorByCommunity(d.community_id))
                .attr('stroke', (d: AlluvialBlock) => selectedCommunities.has(d.community_id) ? '#1F2937' : 'none')
                .attr('stroke-width', (d: AlluvialBlock) => selectedCommunities.has(d.community_id) ? 3 : 0)
                .attr('opacity', (d: AlluvialBlock) => selectedCommunities.size === 0 || selectedCommunities.has(d.community_id) ? 1 : 0.35)
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
    }, [data]) // 描画はデータ変化時に一度

    // 選択状態が変わったらスタイルだけ更新（再レイアウトしない）
    useEffect(() => {
        if (!svgRef.current) return
        const svg = d3.select(svgRef.current)
        svg.selectAll<SVGRectElement, any>('rect.comm-rect')
            .attr('stroke', function (d: any) {
                const cid = d3.select(this).attr('data-community')!
                return selectedCommunities.has(cid) ? '#1F2937' : 'none'
            })
            .attr('stroke-width', function (d: any) {
                const cid = d3.select(this).attr('data-community')!
                return selectedCommunities.has(cid) ? 3 : 0
            })
            .attr('opacity', function () {
                const cid = d3.select(this).attr('data-community')!
                return selectedCommunities.size === 0 || selectedCommunities.has(cid) ? 1 : 0.35
            })
    }, [selectedCommunities])

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
                <ul>
                    <li>各時刻スライスで縦方向にドラッグしてコミュニティを選択（Shiftで加算）</li>
                    <li>ブロックをクリックしてコミュニティを選択/選択解除</li>
                    <li>重なり面積率 ≥ 0.5 で選択判定（ブラシはスライスにつき1つ）</li>
                </ul>
            </div>
        </div>
    )
}
