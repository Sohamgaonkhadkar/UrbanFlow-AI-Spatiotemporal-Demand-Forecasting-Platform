"""Vercel entrypoint: same-origin frozen API and built cinematic frontend."""
from contextlib import asynccontextmanager
from pathlib import Path
import sys

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).resolve().parent
# Preserve the original import paths embedded in the trusted frozen artifact.
sys.path.insert(0, str(ROOT / "backend"))
from main import app as api_app


@asynccontextmanager
async def lifespan(app):
    # Mounted applications do not receive lifespan events automatically.
    async with api_app.router.lifespan_context(api_app):
        yield


app = FastAPI(title="UrbanFlow AI", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
app.mount("/api", api_app)
app.mount("/", StaticFiles(directory=str(ROOT / "frontend" / "dist"), html=True, check_dir=False), name="frontend")
