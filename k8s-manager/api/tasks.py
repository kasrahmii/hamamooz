from celery import shared_task
from .models import Backup, Cluster, BackupSchedule
from .k8s import get_app_pod, exec_in_pod, stream_backup_from_pod
import os
from datetime import date
import base64
from django.utils import timezone
from datetime import timedelta
import uuid

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
        

        stream = stream_backup_from_pod(
            cluster,
            app.namespace.name,
            pod_name,
            backup.source_path
        )


        backup_dir = f"backups/{app.id}/{date.today()}"

        os.makedirs(
            backup_dir,
            exist_ok=True
        )

        backup_path = f"{backup_dir}/{backup_id}.tar.gz"


        encoded_data = ""

        while stream.is_open():
            stream.update(timeout=1)

            if stream.peek_stdout():
                encoded_data += stream.read_stdout()

        stream.close()


        with open(backup_path, "wb") as f:
            f.write(
                base64.b64decode(encoded_data)
            )

        stream.close()


        backup.backup_path = backup_path
        backup.status = "completed"
        backup.save()

        return backup_id

    except Exception as e:

        print("Backup failed:", e)

        backup.status = "failed"
        backup.save()

        raise e

@shared_task(name="api.tasks.check_backup_schedules")
def check_backup_schedules():

    now = timezone.now()

    schedules = BackupSchedule.objects.filter(
        enabled=True
    )

    for schedule in schedules:

        should_run = (
            schedule.last_run is None or
            now - schedule.last_run >= timedelta(
                minutes=schedule.interval_minutes
            )
        )

        if not should_run:
            continue

        backup = Backup.objects.create(
            app=schedule.app,
            backup_id=f"bkp_{uuid.uuid4().hex[:6]}",
            source_path=schedule.source_path
        )

        schedule.last_run = now
        schedule.save()

        run_backup.delay(
            backup.backup_id
        )