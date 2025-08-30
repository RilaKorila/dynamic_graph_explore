import * as d3 from 'd3'

// グローバルな最小・最大DC番号を管理
let globalMinDc: number = 0
let globalMaxDc: number = 0

// グローバルなDC番号の範囲を設定
export const setGlobalDcRange = (minDc: number, maxDc: number): void => {
    globalMinDc = minDc
    globalMaxDc = maxDc
}

// グローバルなDC番号の範囲を取得
export const getGlobalDcRange = (): { minDc: number; maxDc: number } => {
    return { minDc: globalMinDc, maxDc: globalMaxDc }
}

// 動的コミュニティIDから色を取得する関数
export const getDynamicCommunityColor = (dynamicCommunityId: string): string => {
    // 純粋な数字の動的コミュニティIDから色を取得
    const dcNumber = parseInt(dynamicCommunityId)
    // グローバルな最小・最大DC番号を取得
    const { minDc, maxDc } = getGlobalDcRange()

    // 最小・最大のDC番号でスケールして0-1の範囲に正規化
    const normalizedValue = (dcNumber - minDc) / (maxDc - minDc)
    // interpolateTurboで連続的な色を生成
    return d3.interpolateTurbo(normalizedValue)
}
