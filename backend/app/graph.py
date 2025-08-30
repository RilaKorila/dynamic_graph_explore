class Node:
    def __init__(self, id, x, y, cluster_id, label, size=2):
        self.id = int(id)
        self.x = float(x)
        self.y = float(y)
        self.cluster_id = int(cluster_id)
        self.label = label
        self.size = size


class Edge:
    def __init__(self, id, node1, node2):
        self.id = int(id)
        self.node1 = int(node1)
        self.node2 = int(node2)


class Cluster:
    def __init__(self, id, x, y, r, children):
        self.id = int(id)
        self.x = float(x)
        self.y = float(y)
        self.r = float(r)
        self.children = set()
        for child_id in children:
            self.children.add(int(child_id))


class Graph:
    def __init__(self, nodes, edges, clusters):
        self.nodes = nodes
        self.edges = edges
        self.clusters = clusters
