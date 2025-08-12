import * as d3 from 'd3'

// コミュニティIDから色を取得する共通関数
export const getCommunityColor = (communityId: string): string => {
    // 固定のカラーパレット（D3のTableau10スキームを使用）
    const palette = d3.schemeTableau10

    // C<number> 形式のコミュニティIDから色を取得
    const match = communityId.match(/C(\d+)/)
    if (match) {
        const index = parseInt(match[1]) - 1
        return palette[index % palette.length]
    }

    // フォールバック: ハッシュベースの色
    let hash = 0
    for (let i = 0; i < communityId.length; i++) {
        hash = ((hash << 5) - hash) + communityId.charCodeAt(i)
        hash |= 0
    }
    return palette[Math.abs(hash) % palette.length]
}

// コミュニティIDのリストから色マッピングを生成
export const createCommunityColorMap = (communityIds: string[]): Map<string, string> => {
    const colorMap = new Map<string, string>()
    communityIds.forEach(id => {
        colorMap.set(id, getCommunityColor(id))
    })
    return colorMap
}

// コミュニティIDの配列を取得（重複除去・ソート）
export const getUniqueCommunityIds = (nodes: Array<{ cluster: string } | { community_id: string }>): string[] => {
    const communityIds = new Set<string>()

    nodes.forEach(node => {
        if ('cluster' in node) {
            communityIds.add(node.cluster)
        } else if ('community_id' in node) {
            communityIds.add(node.community_id)
        }
    })

    return Array.from(communityIds).sort()
}
