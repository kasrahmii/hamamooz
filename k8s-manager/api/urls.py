from django.urls import path

from .views import (
    clusters,
    namespaces,
    namespace_detail,
    apps,
    app_detail,
    BackupCreateView,
)


urlpatterns = [
    path("clusters/", clusters),

    path("namespaces/", namespaces),
    path("namespaces/<int:namespace_id>/", namespace_detail),

    path("apps/", apps),
    path("apps/<int:app_id>/", app_detail),
    
    path("backup/",BackupCreateView.as_view()),
]