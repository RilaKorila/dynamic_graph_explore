import { Timestamp, CommunityId, CommunityBlock, TransitionCurve, NodeId } from '../types';

// コミュニティ並び替え最適化用の型定義
export interface CommunityOrderingResult {
    commOrder: Record<Timestamp, CommunityId[]>;
    crossingsTotal: number;
    stabilityCost: number;
    score: number;
}

export interface CommunityOrderingConfig {
    lambda: number;           // 安定性重み（デフォルト: 0.05）
    sweepsMax: number;        // 往復スイープの上限回数（デフォルト: 15）
    restarts: number;         // 初期順序の試行回数（デフォルト: 3）
    earlyStopThreshold: number; // 早期打ち切り閾値（改善なし連続回数）
}

export interface CommunitySimilarity {
    sourceCommunity: CommunityId;
    targetCommunity: CommunityId;
    similarity: number;       // Jaccard類似度
    sharedNodes: number;      // 共有ノード数
}

/**
 * コミュニティ並び替え最適化アルゴリズム
 * READMEの要件に基づいて実装
 */
export class CommunityOrderingOptimizer {
    private config: CommunityOrderingConfig;
    private blocks: CommunityBlock[];
    private curves: TransitionCurve[];

    constructor(
        blocks: CommunityBlock[],
        curves: TransitionCurve[],
        config: Partial<CommunityOrderingConfig> = {}
    ) {
        this.blocks = blocks;
        this.curves = curves;
        this.config = {
            lambda: 0.05,
            sweepsMax: 15,
            restarts: 3,
            earlyStopThreshold: 5,
            ...config
        };
    }

    /**
     * メインの最適化処理
     */
    public optimizeOrdering(): CommunityOrderingResult {
        console.log('🚀 コミュニティ並び替え最適化を開始');

        const timestamps = this.getUniqueTimestamps();
        let bestResult: CommunityOrderingResult | null = null;
        let bestScore = Infinity;

        // 複数の初期順序で試行
        for (let restart = 0; restart < this.config.restarts; restart++) {

            const initialOrder = this.generateInitialOrder(timestamps, restart);
            const result = this.optimizeOrderAtTime(timestamps, initialOrder);

            if (result.score < bestScore) {
                bestScore = result.score;
                bestResult = result;
                console.log(`新しい最良スコア: ${bestScore.toFixed(4)}`);
            }
        }

        if (!bestResult) {
            throw new Error('最適化に失敗しました');
        }

        console.log('🎯 最適化完了:', {
            crossingsTotal: bestResult.crossingsTotal,
            stabilityCost: bestResult.stabilityCost,
            finalScore: bestResult.score
        });

        return bestResult;
    }

    /**
     * 初期順序の生成
     */
    private generateInitialOrder(timestamps: Timestamp[], restartIndex: number): Record<Timestamp, CommunityId[]> {
        const order: Record<Timestamp, CommunityId[]> = {};

        timestamps.forEach(timestamp => {
            const communitiesInTime = this.getCommunitiesAtTime(timestamp);

            // 試行ごとに異なる初期順序を生成
            let sortedCommunities: CommunityId[];
            switch (restartIndex % 4) {
                case 0: // デフォルト順序
                    sortedCommunities = [...communitiesInTime];
                    break;
                case 1: // ID逆順
                    sortedCommunities = [...communitiesInTime].reverse();
                    break;
                case 2: // サイズ順（大きい順）
                    sortedCommunities = this.sortBySize(communitiesInTime, timestamp);
                    break;
                case 3: // ランダム順序
                    sortedCommunities = this.shuffleArray([...communitiesInTime]);
                    break;
                default:
                    sortedCommunities = [...communitiesInTime];
            }

            order[timestamp] = sortedCommunities;
        });

        return order;
    }

    /**
     * 時刻ごとの最適化
     */
    private optimizeOrderAtTime(
        timestamps: Timestamp[],
        initialOrder: Record<Timestamp, CommunityId[]>
    ): CommunityOrderingResult {
        let currentOrder = { ...initialOrder };
        let bestOrder = { ...initialOrder };
        let bestScore = this.evaluateOrdering(currentOrder);
        let noImprovementCount = 0;

        console.log(`📊 初期スコア: ${bestScore.toFixed(4)}`);

        // 往復スイープ
        for (let sweep = 0; sweep < this.config.sweepsMax; sweep++) {
            const sweepDirection = sweep % 2 === 0 ? 'left-to-right' : 'right-to-left';

            let improved = false;

            // 左から右へのスイープ
            if (sweepDirection === 'left-to-right') {
                for (let i = 0; i < timestamps.length - 1; i++) {
                    const currentTime = timestamps[i];
                    const nextTime = timestamps[i + 1];

                    const optimizedOrder = this.optimizeOrderBetweenTimes(
                        currentTime, nextTime, currentOrder
                    );

                    if (optimizedOrder) {
                        currentOrder = { ...currentOrder, [nextTime]: optimizedOrder };
                        improved = true;
                    }
                }
            }
            // 右から左へのスイープ
            else {
                for (let i = timestamps.length - 1; i > 0; i--) {
                    const currentTime = timestamps[i];
                    const prevTime = timestamps[i - 1];

                    const optimizedOrder = this.optimizeOrderBetweenTimes(
                        prevTime, currentTime, currentOrder
                    );

                    if (optimizedOrder) {
                        currentOrder = { ...currentOrder, [currentTime]: optimizedOrder };
                        improved = true;
                    }
                }
            }

            // スコア評価
            const currentScore = this.evaluateOrdering(currentOrder);

            if (currentScore < bestScore) {
                bestScore = currentScore;
                bestOrder = { ...currentOrder };
                noImprovementCount = 0;
                improved = true;
            } else {
                noImprovementCount++;
            }

            // 早期打ち切り
            if (noImprovementCount >= this.config.earlyStopThreshold) {
                break;
            }
        }

        return {
            commOrder: bestOrder,
            crossingsTotal: this.calculateCrossings(bestOrder),
            stabilityCost: this.calculateStabilityCost(bestOrder),
            score: bestScore
        };
    }

    /**
     * 隣接時刻間の順序最適化
     */
    private optimizeOrderBetweenTimes(
        sourceTime: Timestamp,
        targetTime: Timestamp,
        currentOrder: Record<Timestamp, CommunityId[]>
    ): CommunityId[] | null {
        const sourceCommunities = currentOrder[sourceTime] || [];
        const targetCommunities = currentOrder[targetTime] || [];

        if (sourceCommunities.length === 0 || targetCommunities.length === 0) {
            return null;
        }

        // バリセンター法による並び替え
        const barycenters = new Map<CommunityId, number>();

        targetCommunities.forEach(targetComm => {
            let totalWeight = 0;
            let weightedSum = 0;

            // ソース時刻のコミュニティとの類似度を計算
            sourceCommunities.forEach((sourceComm, sourceIndex) => {
                const similarity = this.calculateSimilarity(sourceComm, targetComm);
                const weight = similarity.sharedNodes;

                totalWeight += weight;
                weightedSum += weight * sourceIndex;
            });

            // バリセンター計算
            const barycenter = totalWeight > 0 ? weightedSum / totalWeight : 0;
            barycenters.set(targetComm, barycenter);
        });

        // バリセンターでソート
        const optimizedOrder = [...targetCommunities].sort((a, b) => {
            const baryA = barycenters.get(a) || 0;
            const baryB = barycenters.get(b) || 0;
            return baryA - baryB;
        });

        return optimizedOrder;
    }

    /**
     * コミュニティ間の類似度計算
     */
    private calculateSimilarity(comm1: CommunityId, comm2: CommunityId): CommunitySimilarity {
        const nodes1 = this.getCommunityNodes(comm1);
        const nodes2 = this.getCommunityNodes(comm2);

        const intersection = new Set(nodes1.filter(node => nodes2.includes(node)));
        const union = new Set([...nodes1, ...nodes2]);

        const similarity = union.size > 0 ? intersection.size / union.size : 0;

        return {
            sourceCommunity: comm1,
            targetCommunity: comm2,
            similarity,
            sharedNodes: intersection.size
        };
    }

    /**
     * 順序の評価（スコア計算）
     */
    private evaluateOrdering(order: Record<Timestamp, CommunityId[]>): number {
        const crossings = this.calculateCrossings(order);
        const stabilityCost = this.calculateStabilityCost(order);

        // スコア = 交差数 + λ × 安定性コスト
        const score = crossings + this.config.lambda * stabilityCost;

        return score;
    }

    /**
     * 交差数の計算
     */
    private calculateCrossings(order: Record<Timestamp, CommunityId[]>): number {
        let totalCrossings = 0;
        const timestamps = Object.keys(order) as Timestamp[];

        for (let i = 0; i < timestamps.length - 1; i++) {
            const currentTime = timestamps[i];
            const nextTime = timestamps[i + 1];

            const currentOrder = order[currentTime];
            const nextOrder = order[nextTime];

            // 隣接時刻間の曲線の交差を計算
            this.curves.forEach(curve1 => {
                if (curve1.source.t === currentTime && curve1.target.t === nextTime) {
                    this.curves.forEach(curve2 => {
                        if (curve2.source.t === currentTime && curve2.target.t === nextTime) {
                            if (curve1 !== curve2) {
                                if (this.doCurvesCross(curve1, curve2, currentOrder, nextOrder)) {
                                    totalCrossings++;
                                }
                            }
                        }
                    });
                }
            });
        }

        return totalCrossings / 2; // 重複カウントを除去
    }

    /**
     * 曲線の交差判定
     */
    private doCurvesCross(
        curve1: TransitionCurve,
        curve2: TransitionCurve,
        sourceOrder: CommunityId[],
        targetOrder: CommunityId[]
    ): boolean {
        const source1Index = sourceOrder.indexOf(curve1.source.community);
        const source2Index = sourceOrder.indexOf(curve2.source.community);
        const target1Index = targetOrder.indexOf(curve1.target.community);
        const target2Index = targetOrder.indexOf(curve2.target.community);

        if (source1Index === -1 || source2Index === -1 || target1Index === -1 || target2Index === -1) {
            return false;
        }

        // 交差判定: (source1 < source2 && target1 > target2) || (source1 > source2 && target1 < target2)
        return (source1Index < source2Index && target1Index > target2Index) ||
            (source1Index > source2Index && target1Index < target2Index);
    }

    /**
     * 安定性コストの計算
     */
    private calculateStabilityCost(order: Record<Timestamp, CommunityId[]>): number {
        let totalCost = 0;
        const timestamps = Object.keys(order) as Timestamp[];

        for (let i = 1; i < timestamps.length; i++) {
            const prevTime = timestamps[i - 1];
            const currentTime = timestamps[i];

            const prevOrder = order[prevTime];
            const currentOrder = order[currentTime];

            // 隣接時刻間の順序変化を計算
            let cost = 0;
            currentOrder.forEach((comm, index) => {
                const prevIndex = prevOrder.indexOf(comm);
                if (prevIndex !== -1) {
                    cost += Math.abs(index - prevIndex);
                }
            });

            totalCost += cost;
        }

        return totalCost;
    }

    /**
     * 最適化された順序をCommunityBlockに適用
     */
    public applyOrderingToBlocks(optimizedOrder: Record<Timestamp, CommunityId[]>): CommunityBlock[] {
        console.log('🔧 最適化された順序をCommunityBlockに適用');

        const updatedBlocks = [...this.blocks];
        const timestamps = Object.keys(optimizedOrder) as Timestamp[];

        timestamps.forEach(timestamp => {
            const communitiesInOrder = optimizedOrder[timestamp];
            const totalCommunities = communitiesInOrder.length;

            communitiesInOrder.forEach((communityId, index) => {
                // 対応するブロックを更新
                const blockIndex = updatedBlocks.findIndex(block =>
                    block.t === timestamp && block.communityId === communityId
                );

                if (blockIndex !== -1) {
                    const y0 = index / totalCommunities;
                    const y1 = (index + 1) / totalCommunities;

                    updatedBlocks[blockIndex] = {
                        ...updatedBlocks[blockIndex],
                        y0,
                        y1
                    };
                }
            });
        });

        return updatedBlocks;
    }

    // ユーティリティ関数
    private getUniqueTimestamps(): Timestamp[] {
        const timestamps = new Set<Timestamp>();
        this.blocks.forEach(block => timestamps.add(block.t));
        return Array.from(timestamps).sort();
    }

    private getCommunitiesAtTime(timestamp: Timestamp): CommunityId[] {
        return this.blocks
            .filter(block => block.t === timestamp)
            .map(block => block.communityId);
    }

    private getCommunityNodes(communityId: CommunityId): NodeId[] {
        const block = this.blocks.find(b => b.communityId === communityId);
        return block ? block.nodes : [];
    }

    private sortBySize(communities: CommunityId[], timestamp: Timestamp): CommunityId[] {
        return communities.sort((a, b) => {
            const blockA = this.blocks.find(block => block.t === timestamp && block.communityId === a);
            const blockB = this.blocks.find(block => block.t === timestamp && block.communityId === b);
            return (blockB?.nodes.length || 0) - (blockA?.nodes.length || 0);
        });
    }

    private shuffleArray<T>(array: T[]): T[] {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}
