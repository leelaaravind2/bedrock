"""Root URL configuration.

A public health endpoint, plus every entity app's routes auto-included under
/api/ (sorted for deterministic order). The shell does not name any entity — it
mounts whatever entity apps are present.
"""
import os
from pathlib import Path

from django.http import JsonResponse
from django.urls import include, path

BASE_DIR = Path(__file__).resolve().parent.parent


def health(request):
    return JsonResponse({"status": "ok", "app": "__PROJECT_NAME__"})


urlpatterns = [path("api/health/", health)]

_entities_dir = BASE_DIR / "entities"
if _entities_dir.is_dir():
    for _name in sorted(os.listdir(_entities_dir)):
        if (_entities_dir / _name / "urls.py").is_file():
            urlpatterns.append(path("api/", include(f"entities.{_name}.urls")))
