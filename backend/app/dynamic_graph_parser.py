import csv
from app.graph import Cluster, Edge, Graph, Node  # type: ignore


class GraphParser:
    def __init__(
        self,
        path: str,
        dataset_name,
    ):
        self.data = self.read_csv(path)
        self.dataset_name = dataset_name
        self.gen_graph()

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

    def get_cluster_info(self, start: int):
        """
        :returns: the set of Cluster
        """
        cluster_data = self.data[start:]
        clusters = set()

        for i in range(0, len(cluster_data), 2):
            id, x, y, r = cluster_data[i][0:4]
            children = cluster_data[i + 1][1:]

            # dynamic_community_id は後でアサイン
            cluster = Cluster(id, x, y, r, children)
            clusters.add(cluster)

        return clusters

    def gen_graph(self):
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

        self.clusters = self.get_cluster_info(NODE_NUM + EDGE_NUM + 3)

        return Graph(self.nodes, self.edges, self.clusters)

    def read_csv(self, path):
        with open(path) as f:
            reader = csv.reader(f)
            data = [row for row in reader]

        return data
