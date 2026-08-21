from celery import shared_task


@shared_task
def test_backup_task():

    print("Backup task is running")

    return "done"