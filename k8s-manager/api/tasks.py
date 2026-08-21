from celery import shared_task
from .models import Backup, Cluster
from .k8s import get_app_pod, exec_in_pod


@shared_task(name="api.tasks.run_backup")
def run_backup(backup_id):

    backup = Backup.objects.get(
        backup_id=backup_id
    )

    backup.status = "running"
    backup.save()

    try:
        app = backup.app

        cluster = app.namespace.cluster

        pod_name = get_app_pod(
            cluster,
            app.namespace.name,
            app.name
        )

        if not pod_name:
            raise Exception("No running pod found")

        command = [
            "sh",
            "-c",
            f"tar czf /tmp/{backup_id}.tar.gz {backup.source_path}"
        ]

        result = exec_in_pod(
            cluster,
            app.namespace.name,
            pod_name,
            command
        )

        print(result)

        backup.status = "completed"
        backup.save()

        return backup_id

    except Exception as e:

        print("Backup failed:", e)

        backup.status = "failed"
        backup.save()

        raise e