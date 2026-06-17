"""
Vercel Serverless Entry Point — FABCARE
Wraps the FastAPI app so Vercel's Python runtime can serve it.
Vercel looks for a top-level `app` (ASGI) object in this file.
"""
import sys
import os

# Make the project root importable so `from main import app` resolves correctly.
# In Vercel, this file lives at /var/task/api/index.py and the root is /var/task/
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from main import app  # noqa: F401  ← Vercel's Python runtime picks up `app` here