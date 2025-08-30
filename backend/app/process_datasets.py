import os
import pandas as pd
from app.dynamic_graph_parser import GraphParser

# DATASET_NAME = "Cit-HepPh"
# DATASET_NAME="facebook"
# DATASET_NAME="timesmoothnessSample"
DATASET_NAME = "NBAF_coauthors"

current_dir = os.path.dirname(os.path.abspath(__file__))
data_dir = os.path.join(current_dir, "..", "data", DATASET_NAME)

timestamps = [str(i) for i in range(1998, 2014)]

# 動的コミュニティ推定のための設定
SIMILARITY_THRESHOLD = 0.4  # Jaccard類似度の閾値


def calculate_jaccard_similarity(set1, set2):
    """2つの集合のJaccard類似度を計算"""
    if not set1 or not set2:
        return 0.0

    intersection = len(set1.intersection(set2))
    union = len(set1.union(set2))

    return intersection / union if union > 0 else 0.0


def find_dynamic_communities(clusters_by_timestamp):
    """時系列での動的コミュニティを推定"""
    #  Dict[Tuple[Timestamp, CommunityId], DynamicCommunityId]
    dynamic_communities = {}
    dynamic_community_id = 1

    for i, (timestamp, clusters) in enumerate(clusters_by_timestamp.items()):
        for cluster in clusters:
            if i == 0:
                # 初期世代はdynamic_community_idを1から順番に割り当てる
                dynamic_communities[(timestamp, cluster.id)] = dynamic_community_id
                dynamic_community_id += 1
            else:
                # 2世代以降は、Jaccard係数により動的コミュニティを割り当てる

                # 前世代のclustersを取得
                prev_clusters = clusters_by_timestamp[previous_timestamp]

                # 1つ前のtimestampのclustersと最も類似するclusterを探す
                best_similar_cluster = None
                best_similar_cluster_jaccard_similarity = 0
                for prev_cluster in prev_clusters:
                    # Jaccard係数により動的コミュニティを割り当てる
                    jaccard_similarity = calculate_jaccard_similarity(
                        cluster.children, prev_cluster.children
                    )
                    if (
                        jaccard_similarity >= SIMILARITY_THRESHOLD
                        and jaccard_similarity > best_similar_cluster_jaccard_similarity
                    ):
                        # ベストを更新
                        best_similar_cluster = prev_cluster
                        best_similar_cluster_jaccard_similarity = jaccard_similarity

                # 全て探索後に、best_similar_clusterがNoneでなければ、
                # best_similar_clusterのdynamic_community_idを継承する
                if best_similar_cluster is not None:
                    # 継承される dynamic_community_id
                    inherit_dynamic_community_id = dynamic_communities[
                        (previous_timestamp, best_similar_cluster.id)
                    ]
                    dynamic_communities[(timestamp, cluster.id)] = (
                        inherit_dynamic_community_id
                    )
                else:
                    # 継承される dynamic_community_idがない場合は、新しいdynamic_community_idを割り当てる
                    dynamic_communities[(timestamp, cluster.id)] = dynamic_community_id
                    dynamic_community_id += 1

        # previous_timestampを 記録
        previous_timestamp = timestamp

    return dynamic_communities


def find_dynamic_communities_archive(clusters_by_timestamp):
    """時系列での動的コミュニティを推定"""
    dynamic_communities = {}  # keyは cluster.id と timestampの連携
    dynamic_communities_got_from_file = {}

    # 各時刻のコミュニティを処理
    for i, (timestamp, clusters) in enumerate(clusters_by_timestamp.items()):

        fname = f"{data_dir}/dynamic_communities/dynamic_community_{i+1}.txt"
        with open(fname, "r") as f:
            for i, line in enumerate(f):
                if i % 2 == 0:  # 偶数行目
                    # 1行目 dynamic_community_id: , 2行目 node_id1,node_id2,node_id3,... の形式
                    dynamic_community_id, _ = line.strip().split(":")
                else:  # 奇数行目
                    node_ids = line.strip().split(",")
                    if line == "\n":
                        continue
                    # node_ids を int に変換
                    dynamic_communities_got_from_file[dynamic_community_id] = [
                        int(node_id) for node_id in node_ids
                    ]

        # clusters.children と node_ids が一致していればそのclustersのidをdynamic_community_idにする
        for cluster in clusters:
            dict_key = f"C{cluster.id}_{timestamp}"
            for (
                dynamic_community_id,
                node_ids,
            ) in dynamic_communities_got_from_file.items():
                if set(cluster.children) == set(node_ids):
                    print("================================================")
                    print(f"{dict_key} <- {dynamic_community_id}")
                    print(f"cluster.children: {cluster.children}")
                    print(f"node_ids: {node_ids}")
                    dynamic_communities[dict_key] = dynamic_community_id
                    break

    return dynamic_communities


def process_datasets():
    print("Processing datasets...")

    # 全時刻のクラスター情報を収集
    clusters_by_timestamp = {}
    graphs_by_timestamp = {}

    for i, timestamp in enumerate(timestamps):
        gen_number = 3
        layout_number = 3

        ## 変換前:
        csv_file = (
            f"{data_dir}/{timestamp}/layout{str(gen_number)}-{str(layout_number)}.csv"
        )
        graph = GraphParser(csv_file, DATASET_NAME)

        graphs_by_timestamp[timestamp] = graph
        clusters_by_timestamp[timestamp] = graph.clusters

    # 動的コミュニティIDを生成
    dynamic_community_map = find_dynamic_communities(clusters_by_timestamp)

    # 各時刻のデータを処理
    for i, timestamp in enumerate(timestamps):
        graph = graphs_by_timestamp[timestamp]

        # 出力ファイルパス
        output_dir = os.path.join(data_dir, "processed")
        os.makedirs(output_dir, exist_ok=True)

        # 各CSVファイルの作成
        does_create_new_file = i == 0
        create_nodes_csv(
            graph.nodes,
            timestamp,
            output_dir,
            does_create_new_file,
            graph.clusters,
            dynamic_community_map,
        )
        create_edges_csv(graph.edges, timestamp, output_dir, does_create_new_file)
        create_alluvial_nodes_csv(
            graph.clusters,
            timestamp,
            output_dir,
            does_create_new_file,
            dynamic_community_map,
        )

        print(f"[Timestamp {timestamp}] All CSV files created successfully!")


def create_nodes_csv(
    nodes, timestamp, output_dir, does_create_new_file, clusters, dynamic_community_map
):
    """
    graph.nodesからnodes.csvを作成する
    ファイルのカラムは、node_id,x,y,time,cluster,label,dynamic_community_id

    Args:
        nodes: graph.nodesのリスト
        timestamp: タイムスタンプ
        output_dir: 出力ディレクトリ
        clusters: graph.clustersのリスト（ノードのcluster_idを決定するため）
        dynamic_community_map: クラスターIDから動的コミュニティIDへのマッピング
    """
    # ノードデータをリストに変換
    nodes_data = []

    # 各ノードがどのクラスターに属するかを決定
    node_to_cluster = {}
    for cluster in clusters:
        for node_id in cluster.children:
            node_to_cluster[node_id] = cluster.id

    for node in nodes:
        # ノードが属するクラスターIDを取得
        cluster_id = node_to_cluster.get(node.id, node.cluster_id)

        # 動的コミュニティIDを取得
        dynamic_community_id = dynamic_community_map[(timestamp, cluster_id)]

        # 各ノードのデータを辞書として作成
        node_data = {
            "node_id": node.id,
            "x": node.x,
            "y": node.y,
            "time": f"{timestamp}",
            "cluster": f"C{cluster_id}_{timestamp}",
            "label": node.label,
            "dynamic_community_id": dynamic_community_id,
        }
        nodes_data.append(node_data)

    # DataFrameに変換（各行が1つのノードを表す）
    df = pd.DataFrame(nodes_data)

    # CSVファイルとして保存
    output_file = os.path.join(output_dir, f"nodes.csv")
    save_csv(df, output_file, does_create_new_file)

    return output_file


def create_edges_csv(edges, timestamp, output_dir, does_create_new_file):
    """
    graph.edgesからedges.csvを作成する
    ファイルのカラムは、src,dst,time
    """
    # エッジデータをリストに変換
    edges_data = []

    for edge in edges:
        # 各エッジのデータを辞書として作成
        edge_data = {
            "src": edge.node1,
            "dst": edge.node2,
            "time": f"{timestamp}",
        }
        edges_data.append(edge_data)

    # DataFrameに変換（各行が1つのエッジを表す）
    df = pd.DataFrame(edges_data)

    # CSVファイルとして保存
    output_file = os.path.join(output_dir, f"edges.csv")
    save_csv(df, output_file, does_create_new_file)

    print(f"Edges CSV created successfully: {output_file}")
    print(f"Total edges: {len(df)}")

    return output_file


def create_alluvial_nodes_csv(
    clusters, timestamp, output_dir, does_create_new_file, dynamic_community_map
):
    """
    graph.clustersからalluvial_nodes.csvを作成する
    ファイルのカラムは、time,community_id,size,label,dynamic_community_id

    Args:
        clusters: graph.clustersのリスト
        timestamp: タイムスタンプ
        output_dir: 出力ディレクトリ
        dynamic_community_map: クラスターIDから動的コミュニティIDへのマッピング
    """
    # クラスターデータをリストに変換
    clusters_data = []

    for cluster in clusters:
        # 動的コミュニティIDを取得
        dynamic_community_id = dynamic_community_map[(timestamp, cluster.id)]

        # 各クラスターのデータを辞書として作成
        cluster_data = {
            "time": f"{timestamp}",
            "community_id": f"C{cluster.id}_{timestamp}",  # timestampを含む一意のID
            "size": len(cluster.children),
            "label": f"C{cluster.id}",  # cluster.labelがない場合のデフォルト
            "dynamic_community_id": dynamic_community_id,  # 動的コミュニティIDを追加
        }
        clusters_data.append(cluster_data)

    # DataFrameに変換（各行が1つのクラスターを表す）
    df = pd.DataFrame(clusters_data)

    output_file = os.path.join(output_dir, f"alluvial_nodes.csv")
    save_csv(df, output_file, does_create_new_file)

    return output_file


def save_csv(df, output_file, does_create_new_file):
    """
    dfをCSVファイルとして保存する
    """
    if does_create_new_file:
        # 最初の書き込み：ヘッダー付きで新規作成
        df.to_csv(output_file, index=False, mode="w")
    else:
        # 2回目以降：ヘッダーなしで追記
        df.to_csv(output_file, index=False, mode="a", header=False)

    print(f"CSV {'created' if does_create_new_file else 'appended'}: {output_file}")


if __name__ == "__main__":
    process_datasets()
