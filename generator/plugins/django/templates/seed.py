"""Seeds the default login user once, on startup, if it does not already exist.

The password is hashed here at RUNTIME (by Django's auth) — this is application
behaviour, not generator output, so it does not affect the deterministic,
byte-for-byte generation guarantee (ADR-003). Run with:  python seed.py
"""
import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth.models import User  # noqa: E402  (after django.setup())


def run() -> None:
    username = os.environ.get("APP_SEED_ADMIN_USERNAME", "admin")
    password = os.environ.get("APP_SEED_ADMIN_PASSWORD", "admin123")
    if not User.objects.filter(username=username).exists():
        User.objects.create_user(username=username, password=password)
        print(f'Seeded default user "{username}"')


if __name__ == "__main__":
    run()
