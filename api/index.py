"""
FABCARE — api/index.py
Vercel Serverless Entry Point

Vercel's Python runtime requires the WSGI/ASGI app to be importable
from api/index.py. This file imports the FastAPI `app` from main.py
(which lives at the project root) and re-exports it as `app` so
Vercel can discover and serve it.

Route: ALL /api/* requests → this file → FastAPI app
"""

import sys
import os

# ── Make the project root importable ─────────────────────────
# Vercel executes this file from the api/ subdirectory, so we
# need to add the parent directory (project root) to sys.path
# so that `import main` can find main.py at the root level.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ── Import the FastAPI application ────────────────────────────
# Vercel looks for a variable named `app` in this module.
from main import app  # noqa: F401  (re-exported for Vercel)