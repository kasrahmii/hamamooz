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