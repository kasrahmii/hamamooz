from kubernetes import client


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