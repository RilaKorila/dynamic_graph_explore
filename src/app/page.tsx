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

                {/* 時刻スライダー（上側） */}
                <div className="mb-8">
                    <TimeSlider />
                </div>

                {/* Community Dynamics View */}
                <div>
                    <h2 className="text-xl font-semibold mb-4 mt-4">Community Dynamics View</h2>
                    <DynamicCommunityCanvas />
                </div>


                {/* Graph View */}
                <div>
                    <h2 className="text-xl font-semibold mb-4 mt-4">Graph View</h2>
                    <MultiGraphChart />
                </div>

                {/* 凡例 */}
                <div>
                    <h2 className="text-xl font-semibold mb-4 mt-4">Community Legend</h2>
                    <Legend />
                </div>
            </div>
        </main>
    )
}
