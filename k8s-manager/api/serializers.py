from rest_framework import serializers
from .models import Cluster, Namespace, App
from .models import Backup

class ClusterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cluster
        fields = ["id", "address", "token", "name"]
        extra_kwargs = {
            "token": {"write_only": True}
        }

class NamespaceCreateSerializer(serializers.Serializer):
    cluster_id = serializers.IntegerField()
    name = serializers.CharField(max_length=100)

class NamespaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Namespace
        fields = ["id", "name"]

class AppCreateSerializer(serializers.Serializer):
    namespace_id = serializers.IntegerField()

    name = serializers.CharField(
        max_length=100
    )

    image = serializers.CharField(
        max_length=255
    )

    replicas = serializers.IntegerField(
        min_value=1,
        default=1
    )

    cpu = serializers.CharField(
        max_length=50,
        default="100m"
    )

    memory = serializers.CharField(
        max_length=50,
        default="128Mi"
    )

class AppUpdateSerializer(serializers.Serializer):
    image = serializers.CharField(
        max_length=255,
        required=False
    )

    replicas = serializers.IntegerField(
        min_value=1,
        required=False
    )

    cpu = serializers.CharField(
        max_length=50,
        required=False
    )

    memory = serializers.CharField(
        max_length=50,
        required=False
    )

class BackupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Backup
        fields = [
            "backup_id",
            "app",
            "source_path",
            "status",
            "backup_path",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "backup_id",
            "status",
            "created_at",
        ]