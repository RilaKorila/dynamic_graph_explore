'use client'

import TimeSlider from '@/components/TimeSlider'
import LegendAndSearch from '@/components/LegendAndSearch'
import AlluvialChart from '@/components/AlluvialChart'

export default function Home() {
    return (
        <main className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">
                    Dynamic Graph Explorer
                </h1>
                <p className="text-gray-600 mb-8">
                    Alluvial と Graph Layout が連動する可視化プログラム
                </p>

                {/* 時刻スライダー（上側） */}
                <div className="mb-8">
                    <TimeSlider />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Alluvial ビュー（左側） */}
                    <div>
                        <AlluvialChart />
                    </div>

                    {/* Graph ビュー（右側） */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-xl font-semibold mb-4">Graph View</h2>
                        <div className="h-96 bg-gray-100 rounded flex items-center justify-center">
                            <p className="text-gray-500">Graph (Sigma.js) - Coming Soon</p>
                        </div>
                    </div>
                </div>

                {/* 凡例・検索（下側） */}
                <div>
                    <LegendAndSearch />
                </div>
            </div>
        </main>
    )
}
