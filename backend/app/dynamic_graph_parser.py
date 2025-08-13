import csv

from app.graph import Cluster, Edge, Graph, Node


class GraphParser:
    def __init__(
        self,
        path: str,
        dataset_name,
    ):
        self.data = self.read_csv(path)
        self.dataset_name = dataset_name

        target_timestamp = 1  # FIXME: 動的に変化
        self.gen_graph(target_timestamp)

    def get_node_info(self, start, end):
        """
        :inputs:
        start: csvファイルの#nodesマークの次の行数番目
        end: csvファイルの#edgesマークの次の行数番目

        :returns: the set of Node
        ex) node_infoの形式:
        ['6', '0.1607111272237108', '-0.39465334490527576', '2', 'Viant MR ']
        """
        nodes = set()

        for node_info in self.data[start:end]:
            node = Node(*node_info)  # type: ignore
            nodes.add(node)

        return nodes

    def get_edge_info(self, start, end):
        """
        :returns: the set of Edge
        ex) node_infoの形式:
        ['16076', '1537', '168']
        """
        edges = set()

        # TODO 無向グラフなのでedgeが2重になっている(おそらくkoala起因)
        for edge_info in self.data[start:end]:
            edge = Edge(*edge_info)
            edges.add(edge)

        return edges

    def get_cluster_info(self, start: int, target_timestamp: int = -1):
        """
        :returns: the set of Cluster
        """
        cluster_data = self.data[start:]
        clusters = set()

        if int(target_timestamp) > 1:
            previous_timestamp = int(target_timestamp) - 1
            dynamic_community_map = self.get_dynamic_community_id_map_with_history(
                target_timestamp, previous_timestamp, 0.25
            )
        else:
            dynamic_community_map = self.get_dynamic_community_id_map(target_timestamp)

        for i in range(0, len(cluster_data), 2):
            id, x, y, r = cluster_data[i][0:4]
            children = cluster_data[i + 1][1:]

            dynamic_community_id = -1
            for id, nodes_in_dynamic_community in dynamic_community_map.items():
                if len(set(children) - nodes_in_dynamic_community) == 0:  # 集合が一致
                    dynamic_community_id = id

            cluster = Cluster(id, x, y, r, children, dynamic_community_id)
            clusters.add(cluster)

        return clusters

    def get_dynamic_community_id_map(self, target_timestamp):
        """
        dynamic_community_idをキー、各クラスターに属するnode_id群をバリューにもつ辞書型を返す

        Args:
            target_timestamp: 対象のタイムスタンプ

        File format:
        dynamic_community_id:
        node_id1,node_id2,node_id3,...
        """
        fname = f"{self.dataset_name}/dynamic_communities/dynamic_community_{target_timestamp}.txt"

        dynamic_community = {}

        try:
            with open(fname, "r") as f:
                lines = f.readlines()

            # 初期値として-1を設定（どのコミュニティにも属さない場合）
            self.dynamic_community_id = -1

            # 2行ずつ読み込む
            for i in range(0, len(lines), 2):
                if i + 1 >= len(lines):  # ファイル末尾の処理
                    break

                community_id = int(lines[i].strip().split(":")[0])
                if lines[i + 1].strip() == "":
                    nodes_in_community = set()
                else:
                    nodes_in_community = set(map(str, lines[i + 1].strip().split(",")))

                dynamic_community[community_id] = nodes_in_community

        except FileNotFoundError:
            print(f"Warning: Community file not found: {fname}")

        return dynamic_community

    def get_dynamic_community_id_map_with_history(
        self, target_timestamp, previous_timestamp, jaccard_threshold=0.5
    ):
        """
        前のタイムスタンプのコミュニティとJaccard係数で比較し、閾値以上の場合は同じIDを割り当てる

        Args:
            target_timestamp: 対象のタイムスタンプ
            jaccard_threshold: Jaccard係数の閾値（デフォルト: 0.5）

        Returns:
            dict: dynamic_community_idをキー、各クラスターに属するnode_id群をバリューにもつ辞書型
        """

        def calculate_jaccard(set1, set2):
            if not set1 or not set2:
                return 0.0
            intersection = len(set1.intersection(set2))
            union = len(set1.union(set2))
            return intersection / union if union > 0 else 0.0

        current_fname = f"{self.dataset_name}/dynamic_communities/dynamic_community_{target_timestamp}.txt"
        prev_fname = f"{self.dataset_name}/dynamic_communities/dynamic_community_{previous_timestamp}.txt"

        current_community = {}
        prev_community = {}

        # 現在のタイムスタンプのコミュニティを読み込む
        try:
            with open(current_fname, "r") as f:
                lines = f.readlines()

            for i in range(0, len(lines), 2):
                if i + 1 >= len(lines):
                    break

                community_id = int(lines[i].strip().split(":")[0])
                if lines[i + 1].strip() == "":
                    nodes_in_community = set()
                else:
                    nodes_in_community = set(map(str, lines[i + 1].strip().split(",")))

                current_community[community_id] = nodes_in_community

        except FileNotFoundError:
            print(f"Warning: Current community file not found: {current_fname}")
            return current_community

        # 前のタイムスタンプのコミュニティを読み込む
        try:
            with open(prev_fname, "r") as f:
                lines = f.readlines()

            for i in range(0, len(lines), 2):
                if i + 1 >= len(lines):
                    break

                community_id = int(lines[i].strip().split(":")[0])
                if lines[i + 1].strip() == "":
                    nodes_in_community = set()
                else:
                    nodes_in_community = set(map(str, lines[i + 1].strip().split(",")))

                prev_community[community_id] = nodes_in_community

        except FileNotFoundError:
            print(f"Warning: Previous community file not found: {prev_fname}")
            return current_community

        # Jaccard係数に基づいて色を割り当てる
        color_mapping = {}  # 新しいコミュニティID -> 前のコミュニティIDのマッピング
        used_prev_ids = set()  # 既に使用された前のタイムスタンプのID

        for curr_id, curr_nodes in current_community.items():
            best_jaccard = 0
            best_prev_id = -1

            for prev_id, prev_nodes in prev_community.items():
                if prev_id in used_prev_ids:
                    continue

                jaccard = calculate_jaccard(curr_nodes, prev_nodes)
                if jaccard >= jaccard_threshold:
                    best_prev_id = prev_id

            if best_prev_id != -1:
                color_mapping[curr_id] = best_prev_id
                used_prev_ids.add(best_prev_id)
            else:
                # 新しいIDを割り当てる
                color_mapping[curr_id] = curr_id

        # 新しいコミュニティIDを前のタイムスタンプのIDに置き換える
        result_community = {}
        for curr_id, nodes in current_community.items():
            new_id = color_mapping[curr_id]
            result_community[new_id] = nodes

        return result_community

    def gen_graph(self, target_timestamp=-1):
        """
        :returns Graph:
        """

        ## get node info
        if self.data[0][0] == "#nodes":
            NODE_NUM = int(self.data[0][1])
        else:
            raise Exception("Wrong FileTemplate: NODE_NUM not found")

        self.nodes = self.get_node_info(1, NODE_NUM + 1)

        ## get edge info
        if self.data[NODE_NUM + 1][0] == "#edges":
            EDGE_NUM = int(self.data[NODE_NUM + 1][1])
        else:
            raise Exception("Wrong FileTemplate: EDGE_NUM not found")

        self.edges = self.get_edge_info(NODE_NUM + 2, NODE_NUM + EDGE_NUM + 2)

        ## get cluster info
        if self.data[NODE_NUM + EDGE_NUM + 2][0] == "#clusters":
            CLUSTER_NUM = int(self.data[NODE_NUM + EDGE_NUM + 2][1])
        else:
            raise Exception("Wrong FileTemplate: CLUSTER_NUM not found")

        self.clusters = self.get_cluster_info(NODE_NUM + EDGE_NUM + 3, target_timestamp)

        return Graph(self.nodes, self.edges, self.clusters)

    def read_csv(self, path):
        with open(path) as f:
            reader = csv.reader(f)
            data = [row for row in reader]

        return data
