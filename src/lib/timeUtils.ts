import { AlluvialNode, Node } from '@/types'

// データから利用可能な時間を取得（重複除去・ソート）
export const getAvailableTimes = (alluvialNodes: AlluvialNode[], graphNodes: Node[]): string[] => {
    const timeSet = new Set<string>()

    // Alluvialデータから時間を取得
    alluvialNodes.forEach(node => {
        timeSet.add(node.time)
    })

    // Graphデータから時間を取得
    graphNodes.forEach(node => {
        timeSet.add(node.time)
    })

    return Array.from(timeSet).sort()
}

// 時間範囲の検証（データが存在する範囲内かチェック）
export const validateTimeRange = (timeRange: [string, string], availableTimes: string[]): [string, string] => {
    if (availableTimes.length === 0) return timeRange

    const [start, end] = timeRange
    const minTime = availableTimes[0]
    const maxTime = availableTimes[availableTimes.length - 1]

    let validStart = start
    let validEnd = end

    // 開始時間が利用可能な時間範囲外の場合
    if (!availableTimes.includes(start) || start < minTime) {
        validStart = minTime
    }

    // 終了時間が利用可能な時間範囲外の場合
    if (!availableTimes.includes(end) || end > maxTime) {
        validEnd = maxTime
    }

    return [validStart, validEnd]
}
