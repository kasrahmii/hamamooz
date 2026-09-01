from celery import shared_task
from rest_framework.decorators import api_view, throttle_classes
from .throttles import NamespaceCreateThrottle
from rest_framework.response import Response
from rest_framework import status

from .models import Cluster
from .serializers import ClusterSerializer

from kubernetes import client
from kubernetes.client.rest import ApiException

from .models import Cluster, Namespace, App
from .serializers import (
    ClusterSerializer,
    ClusterUpdateSerializer,
    NamespaceCreateSerializer,
    NamespaceSerializer,
    AppCreateSerializer,
    AppUpdateSerializer,
)
from .k8s import (
    get_kubernetes_client,
    get_apps_client,
)

from kubernetes.client.rest import ApiException

import uuid
from .models import Backup, App, BackupSchedule
from .serializers import BackupSerializer

from rest_framework.views import APIView

from .tasks import run_backup

from django.core.cache import cache

from .monitoring import k8s_inc


@api_view(["GET"])
def backup_status(request, backup_id):

    try:
        backup = Backup.objects.get(
            backup_id=backup_id
        )

    except Backup.DoesNotExist:
        return Response(
            {
                "error": "Backup not found"
            },
            status=404
        )

    return Response(
        BackupSerializer(backup).data
    )

class BackupCreateView(APIView):

    def post(self, request):

        app_id = request.data.get("app_id")
        source_path = request.data.get("source_path")

        try:
            app = App.objects.get(id=app_id)
        except App.DoesNotExist:
            return Response(
                {"error": "App not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        backup = Backup.objects.create(
            app=app,
            backup_id=f"bkp_{uuid.uuid4().hex[:6]}",
            source_path=source_path,
            status="pending"
        )

        run_backup.delay(
            backup.backup_id
        )

        return Response(
            BackupSerializer(backup).data,
            status=status.HTTP_201_CREATED
        )

    def get(self, request):

        app_id = request.GET.get("app_id")

        if not app_id:
            return Response(
                {
                    "error": "app_id is required"
                },
                status=400
            )

        backups = Backup.objects.filter(
            app_id=app_id
        )

        return Response(
            BackupSerializer(
                backups,
                many=True
            ).data
        )

@api_view(["GET", "POST"])
def clusters(request):

    if request.method == "GET":
        clusters = Cluster.objects.all()
        serializer = ClusterSerializer(clusters, many=True)

        return Response(serializer.data)

    if request.method == "POST":
        serializer = ClusterSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()

            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

@api_view(["GET", "PATCH", "DELETE"])
def cluster_detail(request, cluster_id):

    try:
        cluster = Cluster.objects.get(id=cluster_id)
    except (Cluster.DoesNotExist, ValueError):
        return Response(
            {"error": "Cluster not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    if request.method == "GET":
        return Response(ClusterSerializer(cluster).data)

    if request.method == "DELETE":
        cluster.delete()
        return Response(
            status=status.HTTP_204_NO_CONTENT
        )

    serializer = ClusterUpdateSerializer(
        cluster,
        data=request.data,
        partial=True
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    serializer.save()

    return Response(
        ClusterSerializer(cluster).data
    )

@api_view(["GET", "POST"])
@throttle_classes([NamespaceCreateThrottle])
def namespaces(request):
    if request.method == "GET":
        cluster_id = request.query_params.get("cluster_id")

        if not cluster_id:
            return Response(
                {"error": "cluster_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            cluster = Cluster.objects.get(id=cluster_id)
        except (Cluster.DoesNotExist, ValueError):
            return Response(
                {"error": "Cluster not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        namespaces = Namespace.objects.filter(cluster=cluster)

        serializer = NamespaceSerializer(
            namespaces,
            many=True
        )

        return Response(serializer.data)


    serializer = NamespaceCreateSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    cluster_id = serializer.validated_data["cluster_id"]
    namespace_name = serializer.validated_data["name"]

    try:
        cluster = Cluster.objects.get(id=cluster_id)
    except Cluster.DoesNotExist:
        return Response(
            {"error": "Cluster not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    if Namespace.objects.filter(
        cluster=cluster,
        name=namespace_name
    ).exists():
        return Response(
            {"error": "Namespace already exists"},
            status=status.HTTP_409_CONFLICT
        )

    try:
        k8s = get_kubernetes_client(cluster)

        body = client.V1Namespace(
            metadata=client.V1ObjectMeta(
                name=namespace_name
            )
        )

        k8s.create_namespace(body=body)
        k8s_inc("namespace", "create", True)

    except ApiException as e:
        k8s_inc("namespace", "create", False)
        if e.status == 409:
            return Response(
                {"error": "Namespace already exists in Kubernetes"},
                status=status.HTTP_409_CONFLICT
            )

        if e.status == 401:
            return Response(
                {"error": "Kubernetes authentication failed"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if e.status == 403:
            return Response(
                {"error": "No permission to create Namespace"},
                status=status.HTTP_403_FORBIDDEN
            )

        return Response(
            {"error": "Kubernetes error"},
            status=status.HTTP_502_BAD_GATEWAY
        )

    except Exception:
        k8s_inc("namespace", "create", False)
        return Response(
            {"error": "Could not connect to Kubernetes"},
            status=status.HTTP_502_BAD_GATEWAY
        )

    namespace = Namespace.objects.create(
        cluster=cluster,
        name=namespace_name
    )

    return Response(
        {
            "id": namespace.id,
            "cluster_id": cluster.id,
            "name": namespace.name
        },
        status=status.HTTP_201_CREATED
    )

@api_view(["DELETE"])
def namespace_detail(request, namespace_id):

    try:
        namespace = Namespace.objects.select_related("cluster").get(
            id=namespace_id
        )
    except Namespace.DoesNotExist:
        return Response(
            {"error": "Namespace not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    cluster = namespace.cluster

    try:
        k8s = get_kubernetes_client(cluster)

        k8s.delete_namespace(
            name=namespace.name
        )
        k8s_inc("namespace", "delete", True)

    except ApiException as e:
        k8s_inc("namespace", "delete", False)
        if e.status == 404:
            # It is already gone from Kubernetes.
            # Continue and remove it from our database.
            pass

        elif e.status == 401:
            return Response(
                {"error": "Kubernetes authentication failed"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        elif e.status == 403:
            return Response(
                {"error": "No permission to delete Namespace"},
                status=status.HTTP_403_FORBIDDEN
            )

        else:
            return Response(
                {"error": "Kubernetes error"},
                status=status.HTTP_502_BAD_GATEWAY
            )

    except Exception:
        k8s_inc("namespace", "delete", False)
        return Response(
            {"error": "Could not connect to Kubernetes"},
            status=status.HTTP_502_BAD_GATEWAY
        )

    Namespace.objects.filter(
        id=namespace_id
    ).delete()

    return Response(
        status=status.HTTP_204_NO_CONTENT
    )

@api_view(["GET", "POST"])
def apps(request):

    if request.method == "GET":
        namespace_id = request.query_params.get("namespace_id")

        if not namespace_id:
            return Response(
                {"error": "namespace_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )


        cache_key = f"apps-status-{namespace_id}"

        cached_result = cache.get(cache_key)

        if cached_result is not None:
            print("REDIS CACHE HIT")
            return Response(cached_result)


        print("REDIS CACHE MISS")


        try:
            namespace = Namespace.objects.select_related(
                "cluster"
            ).get(id=namespace_id)

        except (Namespace.DoesNotExist, ValueError):
            return Response(
                {"error": "Namespace not found"},
                status=status.HTTP_404_NOT_FOUND
            )


        apps = App.objects.filter(
            namespace=namespace
        )


        cluster = namespace.cluster


        try:
            k8s = get_kubernetes_client(cluster)

        except Exception:
            k8s_inc("app", "list", False)
            return Response(
                {"error": "Could not connect to Kubernetes"},
                status=status.HTTP_502_BAD_GATEWAY
            )


        result = []


        for app in apps:

            try:
                pod_list = k8s.list_namespaced_pod(
                    namespace=namespace.name,
                    label_selector=f"app={app.name}"
                )
                k8s_inc("app", "list", True)

            except ApiException as e:
                k8s_inc("app", "list", False)

                if e.status == 401:
                    return Response(
                        {"error": "Kubernetes authentication failed"},
                        status=status.HTTP_401_UNAUTHORIZED
                    )

                if e.status == 403:
                    return Response(
                        {"error": "No permission to read Pods"},
                        status=status.HTTP_403_FORBIDDEN
                    )

                return Response(
                    {"error": "Kubernetes error"},
                    status=status.HTTP_502_BAD_GATEWAY
                )


            pods = []
            ready_count = 0


            for pod in pod_list.items:

                pod_ready = False

                if pod.status.conditions:
                    for condition in pod.status.conditions:

                        if (
                            condition.type == "Ready"
                            and condition.status == "True"
                        ):
                            pod_ready = True
                            break


                if pod_ready:
                    ready_count += 1


                pods.append(
                    {
                        "name": pod.metadata.name,
                        "status": pod.status.phase,
                        "ready": pod_ready,
                    }
                )


            app_ready = (
                len(pods) == app.replicas
                and ready_count == app.replicas
            )


            result.append(
                {
                    "id": app.id,
                    "name": app.name,
                    "namespace": namespace.name,
                    "replicas": app.replicas,
                    "ready": app_ready,
                    "pods": pods,
                }
            )


        # SAVE RESULT IN REDIS FOR 60 SECONDS
        cache.set(
            cache_key,
            result,
            timeout=60
        )


        return Response(result)

    serializer = AppCreateSerializer(
        data=request.data
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    namespace_id = serializer.validated_data["namespace_id"]
    app_name = serializer.validated_data["name"]
    image = serializer.validated_data["image"]
    replicas = serializer.validated_data["replicas"]
    cpu = serializer.validated_data["cpu"]
    memory = serializer.validated_data["memory"]

    try:
        namespace = Namespace.objects.select_related(
            "cluster"
        ).get(id=namespace_id)

    except Namespace.DoesNotExist:
        return Response(
            {"error": "Namespace not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    if App.objects.filter(
        namespace=namespace,
        name=app_name
    ).exists():
        return Response(
            {"error": "App already exists"},
            status=status.HTTP_409_CONFLICT
        )

    cluster = namespace.cluster

    labels = {
        "app": app_name
    }

    container = client.V1Container(
        name=app_name,
        image=image,
        resources=client.V1ResourceRequirements(
            requests={
                "cpu": cpu,
                "memory": memory,
            },
            limits={
                "cpu": cpu,
                "memory": memory,
            },
        ),
    )

    pod_template = client.V1PodTemplateSpec(
        metadata=client.V1ObjectMeta(
            labels=labels
        ),
        spec=client.V1PodSpec(
            containers=[container]
        ),
    )

    deployment_spec = client.V1DeploymentSpec(
        replicas=replicas,

        selector=client.V1LabelSelector(
            match_labels=labels
        ),

        template=pod_template,
    )

    deployment = client.V1Deployment(
        metadata=client.V1ObjectMeta(
            name=app_name
        ),
        spec=deployment_spec,
    )

    try:
        k8s = get_apps_client(cluster)

        k8s.create_namespaced_deployment(
            namespace=namespace.name,
            body=deployment
        )
        k8s_inc("app", "create", True)

    except ApiException as e:
        k8s_inc("app", "create", False)

        if e.status == 409:
            return Response(
                {"error": "App already exists in Kubernetes"},
                status=status.HTTP_409_CONFLICT
            )

        if e.status == 401:
            print("KUBERNETES ERROR:", e)
            print("STATUS:", e.status)
            print("BODY:", e.body)
            return Response(
                {"error": "Kubernetes authentication failed"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if e.status == 403:
            return Response(
                {"error": "No permission to create App"},
                status=status.HTTP_403_FORBIDDEN
            )

        if e.status == 422:
            return Response(
                {"error": "Invalid App configuration"},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {"error": "Kubernetes error"},
            status=status.HTTP_502_BAD_GATEWAY
        )

    except Exception:
        k8s_inc("app", "create", False)
        return Response(
            {"error": "Could not connect to Kubernetes"},
            status=status.HTTP_502_BAD_GATEWAY
        )

    app = App.objects.create(
        namespace=namespace,
        name=app_name,
        image=image,
        replicas=replicas,
        cpu=cpu,
        memory=memory,
    )

    cache.delete(
        f"apps-status-{namespace.id}"
    )

    return Response(
        {
            "id": app.id,
            "namespace_id": namespace.id,
            "name": app.name,
            "image": app.image,
            "replicas": app.replicas,
            "cpu": app.cpu,
            "memory": app.memory,
        },
        status=status.HTTP_201_CREATED
    )

@api_view(["PATCH", "DELETE"])
def app_detail(request, app_id):

    try:
        app = App.objects.select_related(
            "namespace__cluster"
        ).get(id=app_id)

    except App.DoesNotExist:
        return Response(
            {"error": "App not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    namespace = app.namespace
    cluster = namespace.cluster


    if request.method == "DELETE":

        try:
            k8s = get_apps_client(cluster)

            k8s.delete_namespaced_deployment(
                name=app.name,
                namespace=namespace.name,
                body=client.V1DeleteOptions(
                    propagation_policy="Foreground"
                )
            )
            k8s_inc("app", "delete", True)

        except ApiException as e:
            k8s_inc("app", "delete", False)

            if e.status == 404:
                # Deployment is already gone from Kubernetes.
                # Continue and remove it from our database.
                pass

            elif e.status == 401:
                return Response(
                    {"error": "Kubernetes authentication failed"},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            elif e.status == 403:
                return Response(
                    {"error": "No permission to delete App"},
                    status=status.HTTP_403_FORBIDDEN
                )

            else:
                return Response(
                    {"error": "Kubernetes error"},
                    status=status.HTTP_502_BAD_GATEWAY
                )

        except Exception:
            k8s_inc("app", "delete", False)
            return Response(
                {"error": "Could not connect to Kubernetes"},
                status=status.HTTP_502_BAD_GATEWAY
            )

        App.objects.filter(id=app_id).delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )

    serializer = AppUpdateSerializer(
        data=request.data
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    if not serializer.validated_data:
        return Response(
            {"error": "No fields to update"},
            status=status.HTTP_400_BAD_REQUEST
        )

    namespace = app.namespace
    cluster = namespace.cluster

    new_image = serializer.validated_data.get(
        "image",
        app.image
    )

    new_replicas = serializer.validated_data.get(
        "replicas",
        app.replicas
    )

    new_cpu = serializer.validated_data.get(
        "cpu",
        app.cpu
    )

    new_memory = serializer.validated_data.get(
        "memory",
        app.memory
    )

    patch_body = {
        "spec": {
            "replicas": new_replicas,
            "template": {
                "spec": {
                    "containers": [
                        {
                            "name": app.name,
                            "image": new_image,
                            "resources": {
                                "requests": {
                                    "cpu": new_cpu,
                                    "memory": new_memory,
                                },
                                "limits": {
                                    "cpu": new_cpu,
                                    "memory": new_memory,
                                },
                            },
                        }
                    ]
                }
            },
        }
    }

    try:
        k8s = get_apps_client(cluster)

        k8s.patch_namespaced_deployment(
            name=app.name,
            namespace=namespace.name,
            body=patch_body
        )
        k8s_inc("app", "update", True)

    except ApiException as e:
        k8s_inc("app", "update", False)

        if e.status == 404:
            return Response(
                {"error": "App not found in Kubernetes"},
                status=status.HTTP_404_NOT_FOUND
            )

        if e.status == 401:
            return Response(
                {"error": "Kubernetes authentication failed"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if e.status == 403:
            return Response(
                {"error": "No permission to update App"},
                status=status.HTTP_403_FORBIDDEN
            )

        if e.status == 422:
            return Response(
                {"error": "Invalid App configuration"},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {"error": "Kubernetes error"},
            status=status.HTTP_502_BAD_GATEWAY
        )

    except Exception:
        k8s_inc("app", "update", False)
        return Response(
            {"error": "Could not connect to Kubernetes"},
            status=status.HTTP_502_BAD_GATEWAY
        )

    app.image = new_image
    app.replicas = new_replicas
    app.cpu = new_cpu
    app.memory = new_memory
    app.save()

    return Response(
        {
            "id": app.id,
            "name": app.name,
            "namespace": namespace.name,
            "image": app.image,
            "replicas": app.replicas,
            "cpu": app.cpu,
            "memory": app.memory,
        }
    )

@shared_task(name="api.tasks.check_backup_schedules")
def check_backup_schedules():

    schedules = BackupSchedule.objects.filter(
        enabled=True
    )

    for schedule in schedules:

        backup = Backup.objects.create(
            app=schedule.app,
            backup_id=f"bkp_{uuid.uuid4().hex[:6]}",
            source_path=schedule.source_path
        )

        run_backup.delay(
            backup.backup_id
        )