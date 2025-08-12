'use client'

import { useVizStore } from '@/store/vizStore'
import { getCommunityColor } from '@/lib/colors'

export default function Legend() {
    const { selectedCommunities, clearSelection, communityColors } = useVizStore()

    const handleClearSelection = () => {
        clearSelection()
    }

    // コミュニティIDのリスト（ストアから動的に取得、フォールバック用のデフォルト値も設定）
    const communityIds = communityColors.size > 0
        ? Array.from(communityColors.keys()).sort()
        : []

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Legend</h2>

            {/* コミュニティ凡例 */}
            <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">Communities</h3>
                <div className="space-y-2">
                    {communityIds.map((id) => {
                        const color = communityColors.get(id) || getCommunityColor(id)
                        return (
                            <div key={id} className="flex items-center gap-3">
                                <div
                                    className="w-4 h-4 rounded-full"
                                    style={{ backgroundColor: color }}
                                />
                                <span className="text-sm font-medium">{id}</span>
                                <span className="text-sm text-gray-600">Comm {id.slice(1)}</span>
                                {selectedCommunities.has(id) && (
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                        ✔️
                                    </span>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* 操作ボタン */}
            <div className="flex gap-3">
                <button
                    onClick={handleClearSelection}
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                    Clear Selection
                </button>
            </div>
        </div>
    )
}
