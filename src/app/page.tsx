'use client'

import { useEffect } from 'react'
import TimeSlider from '@/components/TimeSlider'
import Legend from '@/components/Legend'
import { DynamicCommunityCanvas } from '@/components/DynamicCommunityCanvas'
import MultiGraphChart from '@/components/MultiGraphChart'
import { useDynamicCommunityStore } from '@/store/dynamicCommunityStore'

export default function Home() {
    const { fetchData } = useDynamicCommunityStore();

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <main className="min-h-screen bg-gray-50">
            <div className="w-full mx-auto px-4 py-8">
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

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    {/* Dynamic Community ビュー（左側: 1/3） */}
                    <div className="lg:col-span-1">
                        <DynamicCommunityCanvas />
                    </div>

                    {/* Multi Graph ビュー（右側: 2/3） */}
                    <div className="lg:col-span-2">
                        <MultiGraphChart />
                    </div>
                </div>

                {/* 凡例・検索（下側） */}
                <div>
                    <Legend />
                </div>
            </div>
        </main>
    )
}
