'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useVizStore } from '@/store/vizStore'
import { getAvailableTimes, validateTimeRange } from '@/lib/timeUtils'
import { fetchAlluvialNodes, fetchNodes } from '@/lib/api'

export default function TimeSlider() {
    const { timeRange, setBrush } = useVizStore()
    const [availableTimes, setAvailableTimes] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null)
    const sliderRef = useRef<HTMLDivElement>(null)

    // 利用可能な時間を取得（初期化時のみ）
    useEffect(() => {
        async function loadAvailableTimes() {
            try {
                setLoading(true)
                const [alluvialNodes, graphNodes] = await Promise.all([
                    fetchAlluvialNodes(),
                    fetchNodes()
                ])

                const times = getAvailableTimes(alluvialNodes, graphNodes)
                setAvailableTimes(times)

                // 現在の時間範囲を検証・調整（初期化時のみ）
                if (times.length > 0) {
                    const validatedRange = validateTimeRange(timeRange, times)
                    if (validatedRange[0] !== timeRange[0] || validatedRange[1] !== timeRange[1]) {
                        setBrush(validatedRange)
                    }
                }
            } catch (error) {
                console.error('Error loading available times:', error)
            } finally {
                setLoading(false)
            }
        }

        loadAvailableTimes()
    }, []) // 依存関係を空にして初期化時のみ実行

    // timeRangeの変更を監視
    useEffect(() => {
    }, [timeRange])

    // マウス位置から時間インデックスを計算
    const getTimeIndexFromMousePosition = useCallback((clientX: number): number => {
        if (!sliderRef.current) return 0

        const rect = sliderRef.current.getBoundingClientRect()
        const relativeX = clientX - rect.left
        const percentage = (relativeX / rect.width) * 100

        // パーセンテージから最も近い時間インデックスを計算
        const index = Math.round((percentage / 100) * (availableTimes.length - 1))
        return Math.max(0, Math.min(availableTimes.length - 1, index))
    }, [availableTimes.length])

    // ドラッグ開始
    const handleMouseDown = useCallback((handleType: 'start' | 'end') => {
        setIsDragging(handleType)
    }, [])

    // ドラッグ中
    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !sliderRef.current) return

        const newIndex = getTimeIndexFromMousePosition(e.clientX)
        const currentStartIndex = availableTimes.indexOf(timeRange[0])
        const currentEndIndex = availableTimes.indexOf(timeRange[1])

        let newStartIndex = currentStartIndex
        let newEndIndex = currentEndIndex

        if (isDragging === 'start') {
            newStartIndex = Math.min(newIndex, currentEndIndex)
        } else if (isDragging === 'end') {
            newEndIndex = Math.max(newIndex, currentStartIndex)
        }

        // 範囲が変更された場合のみ更新
        if (newStartIndex !== currentStartIndex || newEndIndex !== currentEndIndex) {
            const newRange: [string, string] = [availableTimes[newStartIndex], availableTimes[newEndIndex]]
            setBrush(newRange)
        }
    }, [isDragging, availableTimes, timeRange, getTimeIndexFromMousePosition, setBrush])

    // ドラッグ終了
    const handleMouseUp = useCallback(() => {
        if (isDragging) {
            setIsDragging(null)
        }
    }, [isDragging])

    // マウスイベントのリスナーを設定
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)

            return () => {
                document.removeEventListener('mousemove', handleMouseMove)
                document.removeEventListener('mouseup', handleMouseUp)
            }
        }
    }, [isDragging, handleMouseMove, handleMouseUp])

    const handleTimeRangeChange = (startIndex: number, endIndex: number) => {
        if (startIndex >= 0 && endIndex >= 0 && startIndex < availableTimes.length && endIndex < availableTimes.length) {
            const newRange: [string, string] = [availableTimes[startIndex], availableTimes[endIndex]]
            setBrush(newRange)
        } else {
            console.warn('TimeSlider: invalid indices', { startIndex, endIndex, availableTimesLength: availableTimes.length })
        }
    }

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Time Control</h2>
                <div className="text-gray-500">Loading time data...</div>
            </div>
        )
    }

    if (availableTimes.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Time Control</h2>
                <div className="text-gray-500">No time data available</div>
            </div>
        )
    }

    const startIndex = availableTimes.indexOf(timeRange[0])
    const endIndex = availableTimes.indexOf(timeRange[1])

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Time Control</h2>

            {/* 時間範囲選択 */}
            <div className="mb-2">
                <div className="space-y-4">
                    {/* 範囲選択スライダー */}
                    <div className="relative">

                        {/* スライダーバー */}
                        <div
                            ref={sliderRef}
                            className="relative h-8 bg-gray-200 rounded-lg cursor-pointer"
                        >
                            {/* 利用可能な時間のメモリ（離散値） */}
                            {availableTimes.map((time, index) => (
                                <div
                                    key={time}
                                    className="absolute top-0 w-1 h-full bg-gray-400"
                                    style={{ left: `${(index / (availableTimes.length - 1)) * 100}%` }}
                                />
                            ))}

                            {/* 選択範囲のハンドル */}
                            <div
                                className="absolute top-0 h-full bg-blue-500 rounded-lg"
                                style={{
                                    left: `${(startIndex / (availableTimes.length - 1)) * 100}%`,
                                    width: `${((endIndex - startIndex) / (availableTimes.length - 1)) * 100}%`
                                }}
                            />

                            {/* 開始ハンドル（ドラッグ可能） */}
                            <button
                                className={`absolute top-0 w-4 h-8 rounded-full shadow-md transform -translate-x-2 transition-colors ${isDragging === 'start'
                                    ? 'bg-blue-800 scale-110'
                                    : 'bg-blue-600 hover:bg-blue-700'
                                    }`}
                                style={{ left: `${(startIndex / (availableTimes.length - 1)) * 100}%` }}
                                onMouseDown={() => handleMouseDown('start')}
                                title="ドラッグして開始時刻を調整"
                            />

                            {/* 終了ハンドル（ドラッグ可能） */}
                            <button
                                className={`absolute top-0 w-4 h-8 rounded-full shadow-md transform -translate-x-2 transition-colors ${isDragging === 'end'
                                    ? 'bg-blue-800 scale-110'
                                    : 'bg-blue-600 hover:bg-blue-700'
                                    }`}
                                style={{ left: `${(endIndex / (availableTimes.length - 1)) * 100}%` }}
                                onMouseDown={() => handleMouseDown('end')}
                                title="ドラッグして終了時刻を調整"
                            />
                        </div>

                        {/* 時間ラベル（離散値のメモリ） */}
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            {availableTimes.map((time, index) => (
                                <span
                                    key={time}
                                    className={`cursor-pointer hover:text-gray-700 ${index >= startIndex && index <= endIndex ? 'text-blue-600 font-medium' : ''
                                        }`}
                                    onClick={() => {
                                        if (index < startIndex) {
                                            handleTimeRangeChange(index, endIndex)
                                        } else if (index > endIndex) {
                                            handleTimeRangeChange(startIndex, index)
                                        }
                                    }}
                                >
                                    {time}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* クイック選択ボタン */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleTimeRangeChange(0, availableTimes.length - 1)}
                            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                        >
                            All Time
                        </button>
                        <button
                            onClick={() => handleTimeRangeChange(availableTimes.length - 1, availableTimes.length - 1)}
                            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                        >
                            Latest
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
