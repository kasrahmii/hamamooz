from kubernetes import client
from kubernetes.stream import stream

def get_configuration(cluster):
    configuration = client.Configuration()

    if cluster.address.startswith("http://") or cluster.address.startswith("https://"):
        configuration.host = cluster.address
    else:
        configuration.host = f"https://{cluster.address}"

    configuration.api_key["authorization"] = f"Bearer {cluster.token}"

    configuration.verify_ssl = False

    return configuration


def get_kubernetes_client(cluster):
    configuration = get_configuration(cluster)

    api_client = client.ApiClient(
        configuration=configuration
    )

    return client.CoreV1Api(api_client)


def get_apps_client(cluster):
    configuration = get_configuration(cluster)

    api_client = client.ApiClient(
        configuration=configuration
    )

    return client.AppsV1Api(api_client)

def exec_in_pod(cluster, namespace, pod_name, command):
    configuration = get_configuration(cluster)

    api_client = client.ApiClient(
        configuration=configuration
    )

    core_api = client.CoreV1Api(api_client)

    response = stream(
        core_api.connect_get_namespaced_pod_exec,
        pod_name,
        namespace,
        command=command,
        stderr=True,
        stdin=False,
        stdout=True,
        tty=False,
    )

    return response

def get_app_pod(cluster, namespace, app_name):
    core_api = get_kubernetes_client(cluster)

    pods = core_api.list_namespaced_pod(
        namespace=namespace,
        label_selector=f"app={app_name}"
    )

    for pod in pods.items:
        if pod.status.phase == "Running":
            return pod.metadata.name

    return None

def read_file_from_pod(cluster, namespace, pod_name, path):
    result = exec_in_pod(
        cluster,
        namespace,
        pod_name,
        [
            "sh",
            "-c",
            f"cat {path}"
        ]
    )

    return result

def stream_backup_from_pod(cluster, namespace, pod_name, source_path):
    configuration = get_configuration(cluster)

    api_client = client.ApiClient(
        configuration=configuration
    )

    core_api = client.CoreV1Api(api_client)

    ws = stream(
        core_api.connect_get_namespaced_pod_exec,
        pod_name,
        namespace,
        command=[
            "sh",
            "-c",
            f"tar czf - {source_path} | base64"
        ],
        stderr=False,
        stdin=False,
        stdout=True,
        tty=False,
        _preload_content=False,
    )

    return ws