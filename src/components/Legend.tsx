'use client'

import { useEffect, useState } from 'react'
import { useVizStore } from '@/store/vizStore'
import { useDynamicCommunityStore } from '@/store/dynamicCommunityStore'
import { fetchAlluvialNodes } from '@/lib/api'
import { getCommunityColor } from '@/lib/colors'
import { CommunityInfo } from '@/types/index'

export default function Legend() {
    const { selectedCommunities, toggleCommunity } = useVizStore()
    const { timestamps } = useDynamicCommunityStore()
    const [communities, setCommunities] = useState<CommunityInfo[]>([])
    const [loading, setLoading] = useState(true)

    // alluvial_nodes.csvからコミュニティ情報を取得
    useEffect(() => {
        async function loadCommunities() {
            try {
                setLoading(true)
                const alluvialNodes = await fetchAlluvialNodes()

                // コミュニティ情報を構築
                const communityInfos: CommunityInfo[] = alluvialNodes.map(node => ({
                    id: node.community_id,
                    time: node.time,
                    size: node.size,
                    label: node.label,
                    color: getCommunityColor(node.community_id)
                }))

                setCommunities(communityInfos)
            } catch (err) {
                console.error('Error loading communities:', err)
            } finally {
                setLoading(false)
            }
        }

        loadCommunities()
    }, [])

    // 各timestampごとにコミュニティをグループ化
    const groupedCommunities = communities.reduce((acc, community) => {
        const timestamp = community.time
        if (!acc[timestamp]) {
            acc[timestamp] = []
        }
        acc[timestamp].push(community)
        return acc
    }, {} as Record<string, CommunityInfo[]>)

    // timestampの順序を定義（storeから取得したtimestampsを使用）
    const timestampOrder = timestamps

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="text-center text-gray-500">Loading communities...</div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Community Legend</h2>

            {/* 各timestampごとにコミュニティを表示 */}
            {timestampOrder.map(timestamp => {
                const timestampCommunities = groupedCommunities[timestamp] || []

                return (
                    <div key={timestamp} className="mb-6">
                        <h3 className="text-lg font-medium text-gray-700 mb-3 border-b border-gray-200 pb-2">
                            {timestamp.charAt(0).toUpperCase() + timestamp.slice(1)}
                        </h3>

                        {/* コミュニティグリッド */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {timestampCommunities.map((community) => {
                                const isSelected = selectedCommunities.has(community.id)

                                return (
                                    <div
                                        key={community.id}
                                        className={`flex items-center p-2 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${isSelected
                                            ? 'bg-blue-50 border-blue-300 shadow-sm'
                                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                            }`}
                                        onClick={() => toggleCommunity(community.id)}
                                    >
                                        {/* カラーパレット */}
                                        <div
                                            className="w-4 h-4 rounded-full mr-3 flex-shrink-0"
                                            style={{ backgroundColor: community.color }}
                                        />

                                        {/* コミュニティ情報 */}
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-sm font-medium ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                                                {community.label}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                Size: {community.size}
                                            </div>
                                        </div>

                                        {/* 選択状態インジケーター */}
                                        {isSelected && (
                                            <span className="ml-auto text-blue-500">
                                                ✔️
                                            </span>
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        {/* コミュニティ数表示 */}
                        <div className="text-xs text-gray-500 mt-2 text-right">
                            {timestampCommunities.length} communities
                        </div>
                    </div>
                )
            })}

            {/* 全体の統計 */}
            <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>Total Communities: {communities.length}</span>
                    <span>Selected: {selectedCommunities.size}</span>
                </div>

                {/* クリアボタン */}
                {selectedCommunities.size > 0 && (
                    <button
                        onClick={() => {
                            selectedCommunities.forEach(community => toggleCommunity(community))
                        }}
                        className="mt-2 px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition-colors"
                    >
                        Clear All
                    </button>
                )}
            </div>
        </div>
    )
}
