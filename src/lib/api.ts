import { Node, Edge, AlluvialNode, AlluvialLink } from '@/types'

const API_BASE_URL = process.env.NODE_ENV === 'production'
    ? '/api'
    : 'http://localhost:8000'

// CSVデータをパースする関数
async function fetchCSV<T>(url: string): Promise<T[]> {
    try {
        const response = await fetch(url)
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const csvText = await response.text()
        const lines = csvText.trim().split('\n')
        const headers = lines[0].split(',')

        return lines.slice(1).map(line => {
            const values = line.split(',')
            const obj: any = {}
            headers.forEach((header, index) => {
                obj[header.trim()] = values[index]?.trim() || ''
            })
            return obj as T
        })
    } catch (error) {
        console.error(`Error fetching CSV from ${url}:`, error)
        return []
    }
}

// ノードデータを取得
export async function fetchNodes(): Promise<Node[]> {
    return fetchCSV<Node>(`${API_BASE_URL}/data/nodes`)
}

// エッジデータを取得
export async function fetchEdges(): Promise<Edge[]> {
    return fetchCSV<Edge>(`${API_BASE_URL}/data/edges`)
}

// Alluvialノードデータを取得
// FIXME: リンク不要かもしれない
export async function fetchAlluvialNodes(): Promise<AlluvialNode[]> {
    return fetchCSV<AlluvialNode>(`${API_BASE_URL}/data/alluvial-nodes`)
}

// Alluvial遷移データを取得
export async function fetchAlluvialLinks(): Promise<AlluvialLink[]> {
    return fetchCSV<AlluvialLink>(`${API_BASE_URL}/data/alluvial-links`)
}

// 特定の時刻のノードデータを取得
export async function fetchNodesByTime(time: string): Promise<Node[]> {
    const nodes = await fetchNodes()
    return nodes.filter(node => node.time === time)
}

// 特定の時刻のエッジデータを取得
export async function fetchEdgesByTime(time: string): Promise<Edge[]> {
    const edges = await fetchEdges()
    return edges.filter(edge => edge.time === time)
}

// ヘルスチェック
export async function checkHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}/health`)
        return response.ok
    } catch (error) {
        console.error('Health check failed:', error)
        return false
    }
}
