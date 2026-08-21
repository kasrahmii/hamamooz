from django.db import models


class Cluster(models.Model):
    address = models.CharField(max_length=255, unique=True)
    token = models.TextField()
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name

class Namespace(models.Model):
    cluster = models.ForeignKey(
        Cluster,
        on_delete=models.CASCADE
    )
    name = models.CharField(max_length=100)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["cluster", "name"],
                name="unique_namespace_per_cluster"
            )
        ]

    def __str__(self):
        return self.name

class App(models.Model):
    namespace = models.ForeignKey(
        Namespace,
        on_delete=models.CASCADE
    )

    name = models.CharField(max_length=100)
    image = models.CharField(max_length=255)
    replicas = models.PositiveIntegerField(default=1)
    cpu = models.CharField(max_length=50)
    memory = models.CharField(max_length=50)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["namespace", "name"],
                name="unique_app_per_namespace"
            )
        ]

    def __str__(self):
        return self.name

class Backup(models.Model):
    STATUS_CHOICES = [
        ("pending", "pending"),
        ("running", "running"),
        ("completed", "completed"),
        ("failed", "failed"),
    ]

    app = models.ForeignKey(
        App,
        on_delete=models.CASCADE
    )

    backup_id = models.CharField(
        max_length=100,
        unique=True
    )

    source_path = models.CharField(
        max_length=255
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    backup_path = models.CharField(
        max_length=500,
        null=True,
        blank=True
    )

    def __str__(self):
        return self.backup_id