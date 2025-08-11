'use client'

import { useState } from 'react'

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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Alluvial ビュー（左側） */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-xl font-semibold mb-4">Alluvial View</h2>
                        <div className="h-96 bg-gray-100 rounded flex items-center justify-center">
                            <p className="text-gray-500">Alluvial Chart (D3) - Coming Soon</p>
                        </div>
                    </div>

                    {/* Graph ビュー（右側） */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-xl font-semibold mb-4">Graph View</h2>
                        <div className="h-96 bg-gray-100 rounded flex items-center justify-center">
                            <p className="text-gray-500">Graph (Sigma.js) - Coming Soon</p>
                        </div>
                    </div>
                </div>

                {/* 時刻スライダー（上側） */}
                <div className="mt-8 bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4">Time Slider</h2>
                    <div className="h-16 bg-gray-100 rounded flex items-center justify-center">
                        <p className="text-gray-500">Time Slider - Coming Soon</p>
                    </div>
                </div>

                {/* 凡例・検索（下側） */}
                <div className="mt-8 bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4">Legend & Search</h2>
                    <div className="h-24 bg-gray-100 rounded flex items-center justify-center">
                        <p className="text-gray-500">Legend & Search - Coming Soon</p>
                    </div>
                </div>
            </div>
        </main>
    )
}
