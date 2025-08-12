'use client'

import { useVizStore } from '@/store/vizStore'
import { useState } from 'react'

const COMMUNITY_COLORS = {
    C1: '#3B82F6', // blue
    C2: '#10B981', // green
    C3: '#F59E0B', // yellow
}

export default function LegendAndSearch() {
    const { selectedCommunities, clearSelection, clearHighlightedNodes } = useVizStore()
    const [searchQuery, setSearchQuery] = useState('')

    const handleClearSelection = () => {
        clearSelection()
        clearHighlightedNodes()
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        // TODO: 検索機能の実装
        console.log('Search query:', searchQuery)
    }

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Legend & Search</h2>

            {/* コミュニティ凡例 */}
            <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">Communities</h3>
                <div className="space-y-2">
                    {Object.entries(COMMUNITY_COLORS).map(([id, color]) => (
                        <div key={id} className="flex items-center gap-3">
                            <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: color }}
                            />
                            <span className="text-sm font-medium">{id}</span>
                            <span className="text-sm text-gray-600">Comm {id.slice(1)}</span>
                            {selectedCommunities.has(id) && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    Selected
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* 検索ボックス */}
            <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">Search</h3>
                <form onSubmit={handleSearch} className="flex gap-2">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by node ID or label..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                    >
                        Search
                    </button>
                </form>
            </div>

            {/* 操作ボタン */}
            <div className="flex gap-3">
                <button
                    onClick={handleClearSelection}
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                    Clear Selection
                </button>
                <button
                    onClick={clearHighlightedNodes}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
                >
                    Clear Highlights
                </button>
            </div>

            {/* 選択状態の表示 */}
            {selectedCommunities.size > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-md">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">Selected Communities:</h4>
                    <div className="flex flex-wrap gap-2">
                        {Array.from(selectedCommunities).map((id) => (
                            <span
                                key={id}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                                {id}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
