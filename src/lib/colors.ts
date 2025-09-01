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

export const getCommunityColorForBigCommunity = (communitySize: number, communityId: string): string => {
    const COLORED_COMMUNITY_SIZE_THRESHOLD = 4

    if (communitySize > COLORED_COMMUNITY_SIZE_THRESHOLD) {
        return getDynamicCommunityColor(communityId)
    }
    return '#a9a9a9'
}

/**
 * 実験結果を示す用, 条件を適宜かえる
 * @param dynamicCommunityId 動的コミュニティID
 * @returns 
 */
export const getCommunityColorWithCustomCondition = (dynamicCommunityId: string): string => {
    // dynamic_communityIdで対象を絞り込む
    if (dynamicCommunityId === '26') {
        return '#FB6A4A' // コーラル node_label_657 含む
    }
    else if (dynamicCommunityId === '23') {
        return '#31A354'
    }
    else if (dynamicCommunityId === '27') {
        return '#4374B3' // 濃い青 2013 node_label_1446 含む
    }
    else if (dynamicCommunityId === '74') {
        return '#9E63E2'
    }
    else if (dynamicCommunityId === '4') {
        return '#FB6BC5' // ピンク 最大のDynamicCommunity node_label_301含む
    }
    else if (dynamicCommunityId === '43') {
        return '#A66D46'
    }
    else if (dynamicCommunityId === '69') {
        return '#6BAED6'
    }
    else if (dynamicCommunityId === '36') {
        return '#E15759' // 明るいコーラル node_label_336
    }
    else if (dynamicCommunityId === '77') {
        return '#B07AA1' // 紫 node_label_908 含む
    }
    else if (dynamicCommunityId === '18') {
        return '#76B7B2'
    }
    else if (dynamicCommunityId === '31') {
        return '#B7794F' // 茶色 node_label_292 含む
    }
    else if (dynamicCommunityId === '75') {
        return '#84C2B8' // 水色 node_label_1226 含む
    }
    else {
        return "#a9a9a9"
    }
}

/**
 * 実験結果を示す用, 条件を適宜かえる
 * @param communityId コミュニティID
 * @param timestamp タイムスタンプ
 * @returns 
 */
export const getCommunityColorWithCustomConditionByTimestamp = (communityId: string, timestamp: string): string => {
    // Single Graph Viewでは dynamic_community_idを持っていないが、timestampを持っているので、それで対象を絞り込む

    if (timestamp === '1') {
        return '#a9a9a9'
    }
    else {
        return "#a9a9a9"
    }
}
