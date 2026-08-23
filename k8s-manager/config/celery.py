from celery import Celery
import os
from celery.schedules import crontab


os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    "config.settings"
)

app = Celery("config")

app.config_from_object(
    "django.conf:settings",
    namespace="CELERY"
)

app.conf.beat_schedule = {
    "check-backup-schedules": {
        "task": "api.tasks.check_backup_schedules",
        "schedule": 60.0,
    },
}

app.autodiscover_tasks()