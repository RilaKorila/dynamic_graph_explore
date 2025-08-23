import {
    Timestamp,
    NodeId,
    CommunityBlock,
    TransitionCurve,
    DynamicCommunity,
    VertexStability,
} from '../types';
import { CommunityOrderingOptimizer } from './communityOrderingOptimizer';

// CSVデータの型定義
interface CsvNode {
    node_id: string;
    x: number;
    y: number;
    time: string;
    cluster: string;
    label: string;
}

interface CsvEdge {
    src: string;
    dst: string;
    time: string;
}

interface CsvAlluvialNode {
    time: string;
    community_id: string;
    size: number;
    label: string;
}

// APIレスポンスの型定義
interface ApiResponse<T> {
    data: T;
    success: boolean;
    message?: string;
}

// データ処理用のユーティリティ関数
export class DynamicCommunityDataProcessor {
    private nodes: CsvNode[] = [];
    private edges: CsvEdge[] = [];
    private alluvialNodes: CsvAlluvialNode[] = [];
    private JACCARD_THRESHOLD: number = 0.1;

    constructor(nodes: CsvNode[], edges: CsvEdge[], alluvialNodes: CsvAlluvialNode[]) {
        this.nodes = nodes;
        this.edges = edges;
        this.alluvialNodes = alluvialNodes;
    }

    // 時刻の一覧を取得
    getTimestamps(): Timestamp[] {
        const times = new Set<string>();
        this.nodes.forEach(node => times.add(node.time));
        this.edges.forEach(edge => times.add(edge.time));
        this.alluvialNodes.forEach(alluvial => times.add(alluvial.time));

        return Array.from(times).sort();
    }

    // コミュニティブロックを生成（最適化アルゴリズム適用）
    generateCommunityBlocks(): CommunityBlock[] {
        console.log('🏗️ CommunityBlock生成開始');

        // 初期ブロックを生成
        const initialBlocks: CommunityBlock[] = [];
        const timestamps = this.getTimestamps();

        timestamps.forEach(timestamp => {
            // その時刻のコミュニティを取得
            const communitiesInTime = this.alluvialNodes.filter(n => n.time === timestamp);

            // 各コミュニティのノードを取得
            communitiesInTime.forEach((community, commIndex) => {
                const communityNodes = this.nodes
                    .filter(n => n.time === timestamp && n.cluster === community.community_id)
                    .map(n => n.node_id);

                // 初期Y座標の計算（コミュニティごとに配置）
                const totalCommunities = communitiesInTime.length;
                const y0 = commIndex / totalCommunities;
                const y1 = (commIndex + 1) / totalCommunities;

                // 密度と安定性の計算
                const density = this.calculateDensity(timestamp, community.community_id);
                const stability = this.calculateStability(timestamp, community.community_id);

                const block = {
                    t: timestamp,
                    communityId: community.community_id,
                    y0,
                    y1,
                    nodes: communityNodes,
                    density,
                    stability,
                    label: community.label
                };

                initialBlocks.push(block);
            });
        });

        // 遷移曲線を生成（最適化に必要）
        const curves = this.generateTransitionCurves(initialBlocks);

        // コミュニティ並び替え最適化を実行
        try {
            const optimizer = new CommunityOrderingOptimizer(initialBlocks, curves);
            const result = optimizer.optimizeOrdering();

            // 最適化された順序をブロックに適用
            const optimizedBlocks = optimizer.applyOrderingToBlocks(result.commOrder);

            return optimizedBlocks;
        } catch (error) {
            console.error('❌ 最適化に失敗しました:', error);
            console.log('⚠️ 初期ブロックを返します');
            return initialBlocks;
        }
    }

    // 遷移曲線を生成（最適化されたブロック位置を使用）
    generateTransitionCurves(optimizedBlocks?: CommunityBlock[]): TransitionCurve[] {
        const curves: TransitionCurve[] = [];
        const timestamps = this.getTimestamps();

        // 最適化されたブロックがある場合はそれを使用、ない場合は初期ブロックを生成
        const blocksToUse = optimizedBlocks || this.generateInitialBlocks();

        // 隣接時刻間の遷移を計算
        for (let i = 0; i < timestamps.length - 1; i++) {
            const currentTime = timestamps[i];
            const nextTime = timestamps[i + 1];

            // 現在時刻のコミュニティ
            const currentCommunities = this.alluvialNodes.filter(n => n.time === currentTime);

            // コミュニティ間の遷移を計算
            currentCommunities.forEach(currentComm => {
                const matchingCommunities = this.findAllMatchingCommunities(
                    currentComm.community_id,
                    currentTime,
                    nextTime
                );

                // 分裂/統合パターンの検知
                if (matchingCommunities.length > 1) {
                    console.log(`🟡 分裂検知: ${currentComm.community_id} → ${matchingCommunities.map(c => `${c.community_id}(${c.similarity.toFixed(2)})`).join(', ')}`);
                    // それぞれのcommunityの類似度を表示
                    for (const nextComm of matchingCommunities) {
                        console.log(`=>  ${currentComm.community_id} → ${nextComm.community_id} (類似度: ${nextComm.similarity.toFixed(2)})`);
                    }
                } else if (matchingCommunities.length === 1) {
                    console.log(`🟢 1対1: ${currentComm.community_id} → ${matchingCommunities[0].community_id} (類似度: ${matchingCommunities[0].similarity.toFixed(2)})`);
                } else {
                    console.log(`🔴 消滅: ${currentComm.community_id} → なし`);
                }

                // 複数のマッチングコミュニティに対して遷移曲線を作成
                matchingCommunities.forEach(nextComm => {
                    // 最適化されたブロックの位置を使用
                    const sourceBlock = blocksToUse.find((b: CommunityBlock) => b.t === currentTime && b.communityId === currentComm.community_id);
                    const targetBlock = blocksToUse.find((b: CommunityBlock) => b.t === nextTime && b.communityId === nextComm.community_id);

                    if (sourceBlock && targetBlock) {
                        const nodes = this.getTransitionNodes(currentComm.community_id, nextComm.community_id);
                        const weight = nodes.length;

                        // 分裂した場合の重み正規化
                        let normalizedWeight = weight;
                        if (matchingCommunities.length > 1) {
                            normalizedWeight = weight / matchingCommunities.length;
                        }

                        // ブロックの中心Y座標を使用
                        const sourceY = (sourceBlock.y0 + sourceBlock.y1) / 2;
                        const targetY = (targetBlock.y0 + targetBlock.y1) / 2;

                        curves.push({
                            source: { t: currentTime, y: sourceY, community: currentComm.community_id },
                            target: { t: nextTime, y: targetY, community: nextComm.community_id },
                            nodes,
                            weight: normalizedWeight,
                            rank: this.calculateTransitionRank(normalizedWeight, nodes.length),
                            dynamicCommunityId: this.generateDynamicCommunityId(currentComm.community_id, nextComm.community_id)
                        });
                    }
                });
            });
        }

        return curves;
    }

    // 動的コミュニティを生成
    generateDynamicCommunities(): DynamicCommunity[] {
        const dynamicCommunities = new Map<string, DynamicCommunity>();
        const timestamps = this.getTimestamps();

        // コミュニティの追跡
        timestamps.forEach(timestamp => {
            const communities = this.alluvialNodes.filter(n => n.time === timestamp);

            communities.forEach(community => {
                const dynamicId = this.findOrCreateDynamicCommunity(community.community_id, timestamp);

                if (!dynamicCommunities.has(dynamicId)) {
                    dynamicCommunities.set(dynamicId, {
                        id: dynamicId,
                        timeline: [],
                        stability: 0,
                        color: this.generateColor(dynamicId)
                    });
                }

                const dynamic = dynamicCommunities.get(dynamicId)!;
                dynamic.timeline.push({ t: timestamp, community: community.community_id });
            });
        });

        // 安定性を計算
        dynamicCommunities.forEach(dynamic => {
            dynamic.stability = this.calculateDynamicCommunityStability(dynamic);
        });

        return Array.from(dynamicCommunities.values());
    }

    // 初期ブロックを生成（最適化前）
    private generateInitialBlocks(): CommunityBlock[] {
        const blocks: CommunityBlock[] = [];
        const timestamps = this.getTimestamps();

        timestamps.forEach(timestamp => {
            // その時刻のコミュニティを取得
            const communitiesInTime = this.alluvialNodes.filter(n => n.time === timestamp);

            // 各コミュニティのノードを取得
            communitiesInTime.forEach((community, commIndex) => {
                const communityNodes = this.nodes
                    .filter(n => n.time === timestamp && n.cluster === community.community_id)
                    .map(n => n.node_id);

                // 初期Y座標の計算（コミュニティごとに配置）
                const totalCommunities = communitiesInTime.length;
                const y0 = commIndex / totalCommunities;
                const y1 = (commIndex + 1) / totalCommunities;

                // 密度と安定性の計算
                const density = this.calculateDensity(timestamp, community.community_id);
                const stability = this.calculateStability(timestamp, community.community_id);

                const block = {
                    t: timestamp,
                    communityId: community.community_id,
                    y0,
                    y1,
                    nodes: communityNodes,
                    density,
                    stability,
                    label: community.label
                };

                blocks.push(block);
            });
        });

        return blocks;
    }

    // 頂点安定性を計算
    generateVertexStabilities(): VertexStability[] {
        const stabilities: VertexStability[] = [];
        const nodeIds = new Set(this.nodes.map(n => n.node_id));

        nodeIds.forEach(nodeId => {
            const stability = this.calculateNodeStability(nodeId);
            stabilities.push({ node: nodeId, stability });
        });

        return stabilities;
    }

    // プライベートメソッド
    private calculateDensity(timestamp: string, communityId: string): number {
        const communityNodes = this.nodes.filter(n => n.time === timestamp && n.cluster === communityId);
        const communityEdges = this.edges.filter(e =>
            e.time === timestamp &&
            communityNodes.some(n => n.node_id === e.src || n.node_id === e.dst)
        );

        if (communityNodes.length <= 1) return 0.5;

        const internalEdges = communityEdges.filter(e =>
            communityNodes.some(n => n.node_id === e.src) &&
            communityNodes.some(n => n.node_id === e.dst)
        );

        const totalPossibleEdges = (communityNodes.length * (communityNodes.length - 1)) / 2;
        return totalPossibleEdges > 0 ? internalEdges.length / totalPossibleEdges : 0.5;
    }

    private calculateStability(timestamp: string, communityId: string): number {
        const timestamps = this.getTimestamps();
        const timeIndex = timestamps.indexOf(timestamp);

        if (timeIndex === 0 || timeIndex === timestamps.length - 1) return 0.5;

        const prevTime = timestamps[timeIndex - 1];
        const nextTime = timestamps[timeIndex + 1];

        const currentNodes = this.nodes.filter(n => n.time === timestamp && n.cluster === communityId);
        const prevNodes = this.nodes.filter(n => n.time === prevTime && n.cluster === communityId);
        const nextNodes = this.nodes.filter(n => n.time === nextTime && n.cluster === communityId);

        const prevStability = this.calculateJaccardSimilarity(currentNodes, prevNodes);
        const nextStability = this.calculateJaccardSimilarity(currentNodes, nextNodes);

        return (prevStability + nextStability) / 2;
    }

    private calculateJaccardSimilarity(nodes1: CsvNode[], nodes2: CsvNode[]): number {
        const ids1 = new Set(nodes1.map(n => n.node_id));
        const ids2 = new Set(nodes2.map(n => n.node_id));

        const intersection = new Set(Array.from(ids1).filter(id => ids2.has(id)));
        const union = new Set(Array.from(ids1).concat(Array.from(ids2)));

        return union.size > 0 ? intersection.size / union.size : 0;
    }

    private findAllMatchingCommunities(currentCommunityId: string, currentTime: string, nextTime: string): Array<CsvAlluvialNode & { similarity: number }> {
        const currentNodes = this.nodes.filter(n => n.time === currentTime && n.cluster === currentCommunityId);
        const nextCommunities = this.alluvialNodes.filter(n => n.time === nextTime);

        const matchingCommunities: Array<CsvAlluvialNode & { similarity: number }> = [];

        nextCommunities.forEach(nextComm => {
            const nextNodes = this.nodes.filter(n => n.time === nextTime && n.cluster === nextComm.community_id);
            const similarity = this.calculateJaccardSimilarity(currentNodes, nextNodes);

            if (similarity > this.JACCARD_THRESHOLD) { // 閾値を超えるすべてのコミュニティを収集
                matchingCommunities.push({
                    ...nextComm,
                    similarity
                });
            }
        });

        return matchingCommunities;
    }

    private getCommunityYPosition(timestamp: string, communityId: string): number | null {
        const communities = this.alluvialNodes.filter(n => n.time === timestamp);
        const index = communities.findIndex(n => n.community_id === communityId);

        if (index === -1) return null;

        const totalCommunities = communities.length;
        return (index + 0.5) / totalCommunities;
    }

    private getTransitionNodes(sourceCommunityId: string, targetCommunityId: string): NodeId[] {
        // 簡易的な実装：両方のコミュニティに含まれるノードを返す
        const sourceNodes = new Set(this.nodes.filter(n => n.cluster === sourceCommunityId).map(n => n.node_id));
        const targetNodes = new Set(this.nodes.filter(n => n.cluster === targetCommunityId).map(n => n.node_id));

        return Array.from(sourceNodes).filter(id => targetNodes.has(id));
    }

    private calculateTransitionRank(weight: number, nodeCount: number): number {
        // 重みとノード数に基づくランク計算
        return weight * nodeCount;
    }

    private generateDynamicCommunityId(sourceCommunityId: string, targetCommunityId: string): string {
        return `D${sourceCommunityId.slice(1)}_${targetCommunityId.slice(1)}`;
    }

    private findOrCreateDynamicCommunity(communityId: string, timestamp: string): string {
        // 簡易的な実装：コミュニティIDをそのまま使用
        return `D${communityId.slice(1)}`;
    }

    private generateColor(dynamicId: string): string {
        // 簡易的な色生成
        const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b'];
        const index = parseInt(dynamicId.slice(1)) % colors.length;
        return colors[index];
    }

    private calculateDynamicCommunityStability(dynamic: DynamicCommunity): number {
        if (dynamic.timeline.length <= 1) return 0.5;

        let totalStability = 0;
        for (let i = 0; i < dynamic.timeline.length - 1; i++) {
            const current = dynamic.timeline[i];
            const next = dynamic.timeline[i + 1];

            if (current.community && next.community) {
                const currentNodes = this.nodes.filter(n => n.time === current.t && n.cluster === current.community);
                const nextNodes = this.nodes.filter(n => n.time === next.t && n.cluster === next.community);
                totalStability += this.calculateJaccardSimilarity(currentNodes, nextNodes);
            }
        }

        return totalStability / (dynamic.timeline.length - 1);
    }

    private calculateNodeStability(nodeId: string): number {
        const nodeTimeline = this.nodes.filter(n => n.node_id === nodeId);
        if (nodeTimeline.length <= 1) return 0.5;

        let totalStability = 0;
        for (let i = 0; i < nodeTimeline.length - 1; i++) {
            const current = nodeTimeline[i];
            const next = nodeTimeline[i + 1];

            if (current.cluster === next.cluster) {
                totalStability += 1.0;
            } else {
                totalStability += 0.0;
            }
        }

        return totalStability / (nodeTimeline.length - 1);
    }
}

// APIクライアント
export class DynamicCommunityApiClient {
    private baseUrl: string;

    constructor(baseUrl: string = 'http://localhost:8000') {
        this.baseUrl = baseUrl;
    }

    // CSVデータを取得
    async fetchCsvData(): Promise<{
        nodes: CsvNode[];
        edges: CsvEdge[];
        alluvialNodes: CsvAlluvialNode[];
    }> {
        try {
            const [nodesResponse, edgesResponse, alluvialResponse] = await Promise.all([
                fetch(`${this.baseUrl}/data/nodes`),
                fetch(`${this.baseUrl}/data/edges`),
                fetch(`${this.baseUrl}/data/alluvial-nodes`)
            ]);

            if (!nodesResponse.ok || !edgesResponse.ok || !alluvialResponse.ok) {
                throw new Error('Failed to fetch CSV data');
            }

            // CSVテキストを取得
            const [nodesText, edgesText, alluvialText] = await Promise.all([
                nodesResponse.text(),
                edgesResponse.text(),
                alluvialResponse.text()
            ]);

            // CSVをパース
            const nodes = this.parseCsvNodes(nodesText);
            const edges = this.parseCsvEdges(edgesText);
            const alluvialNodes = this.parseCsvAlluvialNodes(alluvialText);

            return { nodes, edges, alluvialNodes };
        } catch (error) {
            console.error('Error fetching CSV data:', error);
            throw error;
        }
    }

    // 処理済みデータを取得
    async fetchProcessedData(): Promise<{
        timestamps: Timestamp[];
        communityBlocks: CommunityBlock[];
        transitionCurves: TransitionCurve[];
        dynamicCommunities: DynamicCommunity[];
        vertexStabilities: VertexStability[];
    }> {
        const { nodes, edges, alluvialNodes } = await this.fetchCsvData();

        const processor = new DynamicCommunityDataProcessor(nodes, edges, alluvialNodes);

        return {
            timestamps: processor.getTimestamps(),
            communityBlocks: processor.generateCommunityBlocks(),
            transitionCurves: processor.generateTransitionCurves(),
            dynamicCommunities: processor.generateDynamicCommunities(),
            vertexStabilities: processor.generateVertexStabilities()
        };
    }

    // CSVパーサー
    private parseCsvNodes(csvText: string): CsvNode[] {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',');

        return lines.slice(1).map(line => {
            const values = line.split(',');
            const node: any = {};

            headers.forEach((header, index) => {
                const value = values[index];
                if (header === 'x' || header === 'y') {
                    node[header] = parseFloat(value);
                } else {
                    node[header] = value;
                }
            });

            return node;
        });
    }

    private parseCsvEdges(csvText: string): CsvEdge[] {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',');

        return lines.slice(1).map(line => {
            const values = line.split(',');
            const edge: any = {};

            headers.forEach((header, index) => {
                edge[header] = values[index];
            });

            return edge;
        });
    }

    private parseCsvAlluvialNodes(csvText: string): CsvAlluvialNode[] {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',');

        return lines.slice(1).map(line => {
            const values = line.split(',');
            const alluvialNode: any = {};

            headers.forEach((header, index) => {
                const value = values[index];
                if (header === 'size') {
                    alluvialNode[header] = parseInt(value);
                } else {
                    alluvialNode[header] = value;
                }
            });

            return alluvialNode;
        });
    }
}

// デフォルトインスタンス
export const dynamicCommunityApi = new DynamicCommunityApiClient();
