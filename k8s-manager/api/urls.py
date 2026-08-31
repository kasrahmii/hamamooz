from django.urls import path

from .views import (
    clusters,
    cluster_detail,
    namespaces,
    namespace_detail,
    apps,
    app_detail,
    BackupCreateView,
    backup_status,
)


urlpatterns = [
    path("clusters/", clusters),
    path("clusters/<int:cluster_id>/", cluster_detail),

    path("namespaces/", namespaces),
    path("namespaces/<int:namespace_id>/", namespace_detail),

    path("apps/", apps),
    path("apps/<int:app_id>/", app_detail),

    path("backup/",BackupCreateView.as_view()),
    path("backup/<str:backup_id>/",backup_status),
]