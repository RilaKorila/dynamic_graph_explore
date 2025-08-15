import os
import pandas as pd
from app.dynamic_graph_parser import GraphParser

current_dir = os.path.dirname(os.path.abspath(__file__))
data_dir = os.path.join(current_dir, "..", "data")


DATASET_NAME = "Cit-HepPh"
# DATASET_NAME="facebook"
# DATASET_NAME="timesmoothnessSample"


def process_datasets():
    print("Processing datasets...")

    timestamps = [1, 2]

    for i, time in enumerate(timestamps):
        gen_number = 3
        layout_number = 3

        ## 変換前:
        csv_file = f"{data_dir}/timestamp{str(time)}/layout{str(gen_number)}-{str(layout_number)}.csv"
        graph = GraphParser(csv_file, DATASET_NAME)

        # 出力ファイルパス
        output_dir = os.path.join(data_dir, "processed")
        os.makedirs(output_dir, exist_ok=True)

        # 各CSVファイルの作成
        does_create_new_file = i == 0
        create_nodes_csv(
            graph.nodes, time, output_dir, does_create_new_file, graph.clusters
        )
        create_edges_csv(graph.edges, time, output_dir, does_create_new_file)
        create_alluvial_nodes_csv(
            graph.clusters, time, output_dir, does_create_new_file
        )

        print(f"[Timestamp {time}] All CSV files created successfully!")


def create_nodes_csv(nodes, timestamp, output_dir, does_create_new_file, clusters):
    """
    graph.nodesからnodes.csvを作成する
    ファイルのカラムは、node_id,x,y,time,cluster,label

    Args:
        nodes: graph.nodesのリスト
        timestamp: タイムスタンプ
        output_dir: 出力ディレクトリ
        clusters: graph.clustersのリスト（ノードのcluster_idを決定するため）
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

        # 各ノードのデータを辞書として作成
        node_data = {
            "node_id": node.id,
            "x": node.x,
            "y": node.y,
            "time": f"timestamp{timestamp}",
            "cluster": f"C{cluster_id}_timestamp{timestamp}",  # clustersのIDを使用
            "label": node.label,
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
            "time": f"timestamp{timestamp}",
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


def create_alluvial_nodes_csv(clusters, timestamp, output_dir, does_create_new_file):
    """
    graph.clustersからalluvial_nodes.csvを作成する
    ファイルのカラムは、time,community_id,size,label

    Args:
        clusters: graph.clustersのリスト
        timestamp: タイムスタンプ
        output_dir: 出力ディレクトリ
    """
    # クラスターデータをリストに変換
    clusters_data = []

    for cluster in clusters:
        # 各クラスターのデータを辞書として作成
        cluster_data = {
            "time": f"timestamp{timestamp}",
            "community_id": f"C{cluster.id}_timestamp{timestamp}",  # timestampを含む一意のID
            "size": len(cluster.children),
            "label": f"C{cluster.id}",  # cluster.labelがない場合のデフォルト
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
