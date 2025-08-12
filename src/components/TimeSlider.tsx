'use client'

import { useVizStore } from '@/store/vizStore'
import { useState, useEffect } from 'react'

const TIME_STEPS = ['2021Q1', '2021Q2', '2021Q3']

export default function TimeSlider() {
    const { currentTime, setCurrentTime, timeRange } = useVizStore()
    const [localTime, setLocalTime] = useState(currentTime)

    useEffect(() => {
        setLocalTime(currentTime)
    }, [currentTime])

    const handleTimeChange = (time: string) => {
        setLocalTime(time)
        setCurrentTime(time)
    }

    const handleRangeChange = (index: number, value: string) => {
        const newRange: [string, string] = [...timeRange] as [string, string]
        newRange[index] = value
        useVizStore.getState().setBrush(newRange)
    }

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Time Control</h2>

            {/* 単一時刻スライダー */}
            <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">Current Time</h3>
                <div className="flex gap-2">
                    {TIME_STEPS.map((time) => (
                        <button
                            key={time}
                            onClick={() => handleTimeChange(time)}
                            className={`px-4 py-2 rounded-md transition-colors ${localTime === time
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            {time}
                        </button>
                    ))}
                </div>
            </div>

            {/* 時間範囲選択 */}
            <div>
                <h3 className="text-lg font-medium mb-3">Time Range</h3>
                <div className="flex items-center gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            From
                        </label>
                        <select
                            value={timeRange[0]}
                            onChange={(e) => handleRangeChange(0, e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {TIME_STEPS.map((time) => (
                                <option key={time} value={time}>
                                    {time}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            To
                        </label>
                        <select
                            value={timeRange[1]}
                            onChange={(e) => handleRangeChange(1, e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {TIME_STEPS.map((time) => (
                                <option key={time} value={time}>
                                    {time}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    )
}
