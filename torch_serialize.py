import torch.fx
from torch.fx import Tracer
import json


class BasicTracer(Tracer):
    def is_leaf_module(self, m, module_qualified_name):
        """
        Determine whether a module is a leaf (not traced further).
        
        Args:
            m (torch.nn.Module): The module being considered.
            module_qualified_name (str): The qualified name of the module.
        
        Returns:
            bool: True if the module should be treated as a leaf, False otherwise.
        """
        # Treat all submodules as leaf modules
        return True

def serialize_graph(model, file_path):
    """
    Serialize a hierarchical PyTorch model into a JSON file, including submodule graphs and their relationships.

    Args:
        model (torch.nn.Module): The hierarchical model to serialize.
        file_path (str): Path to save the JSON file.
    """

    def is_standard_torch_nn_module(module):
        """Check if a module is a standard `torch.nn` module."""
        return type(module).__module__.startswith("torch.nn")

    def get_module_info(module):
        """
        Serialize a standard torch.nn module with its type and initialization arguments.
    
        Args:
            module (torch.nn.Module): The module to serialize.
    
        Returns:
            dict: Serialized information about the module.
        """
        module_info = {
            "module_class": f"{type(module).__module__}.{type(module).__name__}",
            "attributes": {}
        }
    
        # Capture module attributes as initialization arguments
        for attr in dir(module):
            if not attr.startswith("_"):  # Skip private and special methods
                value = getattr(module, attr)
                # Serialize only simple types (avoid methods, tensors, etc.)
                if isinstance(value, (int, float, str, tuple, list, dict, bool)):
                    module_info["attributes"][attr] = str(value)
    
        return module_info


    def trace_and_serialize_submodule(module, prefix=""):
        """Recursively trace submodules and serialize their graphs."""
        module_data = {}
        module_data["name"] = prefix if prefix else "root"

        if is_standard_torch_nn_module(module):
            # If it's a standard torch.nn module, don't trace further
            module_data["is_standard_nn"] = True
            module_data["info"] = get_module_info(module)
            return module_data

        module_data["is_standard_nn"] = False

        # Trace the current module
        traced_graph = BasicTracer().trace(module)
        graph_nodes = []
        for node in traced_graph.nodes:
            graph_nodes.append({
                "name": node.name,
                "op": node.op,
                "target": str(node.target),
                "args": [str(arg) for arg in node.args],
                "kwargs": {k: str(v) for k, v in node.kwargs.items()},
            })
        module_data["graph"] = graph_nodes
        module_data["children"] = {}

        # Recursively trace child submodules
        for child_name, child_module in module.named_children():
            child_prefix = f"{prefix}.{child_name}" if prefix else child_name
            module_data["children"][child_name] = trace_and_serialize_submodule(child_module, child_prefix)

        return module_data

    # Serialize the root model
    hierarchical_data = trace_and_serialize_submodule(model)
    
    # Save as JSON
    with open(file_path, "w") as f:
        json.dump(hierarchical_data, f, indent=4)

    print(f"Hierarchical model serialized to {file_path}")
    return hierarchical_data


def deserialize_graph(json_file):
    """
    Deserialize a hierarchical JSON file into a torch.fx.GraphModule.

    Args:
        json_file (str): Path to the JSON file containing the serialized graph.

    Returns:
        torch.nn.Module: Reconstructed hierarchical model.
    """
    def reconstruct_graph(graph_data):
        """Reconstruct a single graph from its serialized data."""
        graph = torch.fx.Graph()
        node_map = {}

        # Create all nodes
        for node_info in graph_data:
            node = graph.create_node(
                op=node_info["op"],
                target=node_info["target"] if node_info["target"] != "None" else None,
                args=[],  # Will resolve later
                kwargs={},  # Will resolve later
                name=node_info["name"],
            )
            node_map[node_info["name"]] = node

        # Resolve connections
        for node_info in graph_data:
            current_node = node_map[node_info["name"]]
            args = [
                node_map[arg] if arg in node_map else eval(arg)
                for arg in node_info["args"]
            ]
            current_node.args = tuple(args)
            kwargs = {
                k: node_map[v] if v in node_map else eval(v)
                for k, v in node_info["kwargs"].items()
            }
            current_node.kwargs = kwargs

        return graph

    def reconstruct_hierarchy(hierarchical_data, parent_name="root"):
        """Recursively reconstruct the hierarchical model."""
        # Reconstruct the graph for the current module
        graph = reconstruct_graph(hierarchical_data["graph"])

        # Create a dummy module
        class DummyModule(torch.nn.Module):
            def __init__(self):
                super().__init__()

        module = torch.fx.GraphModule(DummyModule(), graph)

        # Recursively reconstruct child modules
        for child_name, child_data in hierarchical_data["children"].items():
            child_module = reconstruct_hierarchy(child_data, parent_name=child_name)
            setattr(module, child_name, child_module)

        return module

    # Load JSON
    with open(json_file, "r") as f:
        hierarchical_data = json.load(f)

    # Reconstruct the hierarchical model
    return reconstruct_hierarchy(hierarchical_data)


'''
def serialize_graph_with_shapes(graph_module, file_path, sample_input):
    """
    Serialize a PyTorch FX GraphModule into a JSON file with shape and dtype metadata.

    Args:
        graph_module (torch.fx.GraphModule): The graph module to serialize.
        file_path (str): Path to save the JSON file.
        sample_input (torch.tensor): Sample input to propagate.
    """
    ShapeProp(graph_module).propagate(sample_input)

    graph_data = []

    for node in graph_module.graph.nodes:
        node_data = {
            "name": node.name,
            "op": node.op,
            "target": str(node.target),
            "args": [str(arg) for arg in node.args],
            "kwargs": {k: str(v) for k, v in node.kwargs.items()},
            "users": [user.name for user in node.users],
            "shape": node.meta['tensor_meta'].shape,
            "dtype": node.meta['tensor_meta'].dtype,    
        }
        graph_data.append(node_data)

    with open(file_path, "w") as f:
        json.dump(graph_data, f, indent=4)

    print(f"Graph with shapes and dtypes serialized to {file_path}")
'''


    