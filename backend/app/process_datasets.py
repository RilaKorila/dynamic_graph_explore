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

    timestamps = [1, 2, 3]

    time = 1
    gen_number = 3
    layout_number = 3

    ## 変換前:
    csv_file = f"{data_dir}/timestamp{str(time)}/layout{str(gen_number)}-{str(layout_number)}.csv"
    graph = GraphParser(csv_file, DATASET_NAME)

    # 出力ファイルパス
    output_dir = os.path.join(data_dir, "processed")
    os.makedirs(output_dir, exist_ok=True)

    # 各CSVファイルの作成
    create_nodes_csv(graph.nodes, time, output_dir)
    create_edges_csv(graph.edges, time, output_dir)
    create_alluvial_nodes_csv(graph.clusters, time, output_dir)

    print("All CSV files created successfully!")


def create_nodes_csv(nodes, timestamp, output_dir):
    """
    graph.nodesからnodes.csvを作成する
    ファイルのカラムは、node_id,x,y,time,cluster,label

    Args:
        nodes: graph.nodesのリスト
        timestamp: タイムスタンプ
        output_dir: 出力ディレクトリ
    """
    # ノードデータをリストに変換
    nodes_data = []

    for node in nodes:
        # 各ノードのデータを辞書として作成
        node_data = {
            "node_id": node.id,
            "x": node.x,
            "y": node.y,
            "time": f"timestamp{timestamp}",
            "cluster": f"C{node.cluster_id}",
            "label": node.label,
        }
        nodes_data.append(node_data)

    # DataFrameに変換（各行が1つのノードを表す）
    df = pd.DataFrame(nodes_data)

    # CSVファイルとして保存
    output_file = os.path.join(output_dir, f"nodes.csv")
    df.to_csv(output_file, index=False)

    print(f"Nodes CSV created successfully: {output_file}")
    print(f"Total nodes: {len(df)}")

    return output_file


def create_edges_csv(edges, timestamp, output_dir):
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
    df.to_csv(output_file, index=False)

    print(f"Edges CSV created successfully: {output_file}")
    print(f"Total edges: {len(df)}")

    return output_file


def create_alluvial_nodes_csv(clusters, timestamp, output_dir):
    """
    graph.clustersからalluvial_nodes.csvを作成する
    ファイルのカラムは、time,community_id,size,label
    """
    # クラスターデータをリストに変換
    clusters_data = []

    for cluster in clusters:
        # 各クラスターのデータを辞書として作成
        cluster_data = {
            "time": f"timestamp{timestamp}",
            "community_id": f"C{cluster.id}",
            "size": len(cluster.children),
            "label": f"C{cluster.id}",  # cluster.labelがない場合のデフォルト
        }
        clusters_data.append(cluster_data)

    # DataFrameに変換（各行が1つのクラスターを表す）
    df = pd.DataFrame(clusters_data)

    # CSVファイルとして保存
    output_file = os.path.join(output_dir, f"alluvial_nodes.csv")
    df.to_csv(output_file, index=False)

    print(f"Alluvial nodes CSV created successfully: {output_file}")
    print(f"Total clusters: {len(df)}")

    return output_file


if __name__ == "__main__":
    process_datasets()
