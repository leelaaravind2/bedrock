"""The FastAPI application.

Entity routers are auto-discovered by convention: every
app/entities/<name>/routes.py that exposes `router` and `base_path` is mounted
automatically. This is the FastAPI equivalent of Spring's component scan — the
shell does not need to know which entities exist; it just mounts whatever entity
routers are present. The public health check needs no login; every entity
endpoint depends on the current user (simple login).
"""
import importlib
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI

from . import migrate, seed
from . import entities as entities_pkg


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Apply migrations and seed the default user before serving requests.
    migrate.run()
    seed.run()
    yield


app = FastAPI(title="__PROJECT_NAME__", lifespan=lifespan)


@app.get("/api/health")
def health():
    """Public endpoint — proves the API is up without logging in."""
    return {"status": "ok", "app": "__PROJECT_NAME__"}


def _mount_entity_routers() -> None:
    entities_dir = os.path.dirname(entities_pkg.__file__)
    if not os.path.isdir(entities_dir):
        return
    # Sorted for deterministic mount order.
    for name in sorted(os.listdir(entities_dir)):
        routes_file = os.path.join(entities_dir, name, "routes.py")
        if os.path.isfile(routes_file):
            module = importlib.import_module(f"app.entities.{name}.routes")
            app.include_router(module.router, prefix=module.base_path)


_mount_entity_routers()
