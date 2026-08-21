from celery import shared_task
from .models import Backup


@shared_task(name="api.tasks.run_backup")
def run_backup(backup_id):

    backup = Backup.objects.get(
        backup_id=backup_id
    )

    backup.status = "running"
    backup.save()

    print(f"Running backup {backup_id}")

    backup.status = "completed"
    backup.save()

    return backup_id