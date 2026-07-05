"""Django settings for __PROJECT_NAME__.

A JSON REST API (Django + DRF) wired to __DB_DISPLAY_NAME__. Entity apps are
auto-discovered: every entities/<name>/ that has an apps.py is added to
INSTALLED_APPS automatically — the shell does not need to know which entities
exist (the Django equivalent of a component scan). Standard Django; no dependency
on the tool that generated this project (Laws 19-21).
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Dev default; override with DJANGO_SECRET_KEY in any real deployment.
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-insecure-__ARTIFACT_ID__-secret")
DEBUG = os.environ.get("DJANGO_DEBUG", "1") == "1"
ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "rest_framework",
]

# Auto-discover entity apps (sorted for deterministic order).
_entities_dir = BASE_DIR / "entities"
if _entities_dir.is_dir():
    for _name in sorted(os.listdir(_entities_dir)):
        if (_entities_dir / _name / "apps.py").is_file():
            INSTALLED_APPS.append(f"entities.{_name}")

MIDDLEWARE = [
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "__DB_DJANGO_ENGINE__",
        "NAME": os.environ.get("PGDATABASE", "__DB_NAME__"),
        "USER": os.environ.get("PGUSER", "__DB_USER__"),
        "PASSWORD": os.environ.get("PGPASSWORD", "__DB_PASSWORD__"),
        "HOST": os.environ.get("PGHOST", "localhost"),
        "PORT": os.environ.get("PGPORT", "__DB_PORT__"),
    }
}

# JSON-only API — no HTML browsable API, so no template/staticfiles apps needed.
# Simple login (HTTP Basic) against Django's user table; every entity endpoint
# requires an authenticated user, and generated entity code scopes rows to that
# user (multi-user, ADR-005).
REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework.authentication.BasicAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
USE_TZ = True
