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
    if (dynamicCommunityId === '77') {
        // Cit 1995 node_label_4993 含む
        return '#FB6A4A' // コーラル node_label_657 含む
    }
    else if (dynamicCommunityId === '98') {
        // Cit 1995 node_label_4993 含む
        return '#31A354'
    }
    else if (dynamicCommunityId === '59') {
        // Cit 1995 node_label_3382 含む
        return '#4374B3' // 濃い青 2013 node_label_1446 含む
    }
    else if (dynamicCommunityId === '51') {
        // Cit 1994 node_label_3177 含む
        return '#9E63E2'
    }
    else if (dynamicCommunityId === '3') {
        // Cit 1995 node_label_8288 含む
        return '#FB6BC5' // ピンク 最大のDynamicCommunity node_label_301含む
    }
    else if (dynamicCommunityId === '45') {
        // Cit 1994 node_label_100 含む
        return '#A66D46'
    }
    else if (dynamicCommunityId === '99') {
        // Cit 1995 node_label_7573 含む
        return '#6BAED6'
    }
    else if (dynamicCommunityId === '8') {
        // Cit 1995 node_label_1134 含む
        return '#E15759' // 明るいコーラル node_label_336
    }
    else if (dynamicCommunityId === '72') {
        return '#B07AA1' // 紫 node_label_908 含む
    }
    else if (dynamicCommunityId === '47') {
        // Cit 1995 node_label_4993 含む
        return '#76B7B2'
    }
    else if (dynamicCommunityId === '22') {
        return '#B7794F' // 茶色 node_label_292 含む
    }
    else if (dynamicCommunityId === '70') {
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
