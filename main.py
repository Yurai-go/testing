"""
VELOUR — Elite Wardrobe Concierge
FastAPI Backend · Production Build
Groq API · Llama 4 Scout · Multimodal · SSE Streaming
SQLite Local Session Persistence & Cascade Deletion
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import os
import re
import sqlite3
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator, Optional, List, Dict, Any

import httpx
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("velour")

# ── Constants ─────────────────────────────────────────────────────────────────
# Replace with your actual Groq API Key string
GROQ_API_KEY: str = os.environ.get("GROQ_API_KEY")
GROQ_API_BASE: str     = "https://api.groq.com/openai/v1"
GROQ_CHAT_ENDPOINT: str = f"{GROQ_API_BASE}/chat/completions"
GROQ_MODEL: str        = "meta-llama/llama-4-scout-17b-16e-instruct"

MAX_IMAGE_SIZE_BYTES: int  = 20 * 1024 * 1024   # 20 MB per image
MAX_IMAGES_PER_REQUEST: int = 8
MAX_TOKENS: int            = 2048
REQUEST_TIMEOUT_SECONDS: float = 90.0

ACCEPTED_MIME_TYPES: frozenset[str] = frozenset({
    "image/jpeg", "image/png", "image/webp", "image/gif",
})

DB_PATH: str = "velour_vault.db"

# ── Product Catalog (mirrors product-db.js) ───────────────────────────────────
# This is the single source of truth for affiliate products the AI can recommend.
# Keep this in sync with product-db.js on the frontend.
PRODUCT_CATALOG: List[Dict[str, str]] = [
    {
        "id": "p001",
        "name": "Persil Color Protect Liquid",
        "desc": "pH-neutral formula that locks in color and protects fibers during every wash.",
        "price": "Rp 89.000",
        "shopUrl": "https://shopee.co.id",
        "img": "https://images.unsplash.com/photo-1585441695325-21e9bbfffe57?w=300&q=80",
        "tags": "detergent, colored, cotton, polyester, liquid",
    },
    {
        "id": "p002",
        "name": "Attack Whitening Powder",
        "desc": "Oxygen-boosted powder. Penetrates cotton fibers to lift oils and brighten whites.",
        "price": "Rp 34.000",
        "shopUrl": "https://shopee.co.id",
        "img": "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=300&q=80",
        "tags": "detergent, white, cotton, powder, brightening",
    },
    {
        "id": "p003",
        "name": "Vanish Oxi Action Liquid",
        "desc": "Oxygen bleach alternative. Keeps synthetics bright without the yellowing risk of chlorine.",
        "price": "Rp 62.000",
        "shopUrl": "https://shopee.co.id",
        "img": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&q=80",
        "tags": "detergent, white, polyester, synthetic, oxygen bleach",
    },
    {
        "id": "p004",
        "name": "Downy Sport Odor Protect",
        "desc": "Low-suds odor-targeting liquid. Lifts sweat and oils from synthetic fibers without residue.",
        "price": "Rp 45.000",
        "shopUrl": "https://tokopedia.com",
        "img": "https://images.unsplash.com/photo-1585441695325-21e9bbfffe57?w=300&q=80",
        "tags": "detergent, colored, polyester, synthetic, sport, odor",
    },
    {
        "id": "p005",
        "name": "IKEA MULIG Drying Rack",
        "desc": "Freestanding flat drying rack. Keeps knitwear and delicates in a horizontal lay-flat position.",
        "price": "Rp 149.000",
        "shopUrl": "https://www.ikea.com/id",
        "img": "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=300&q=80",
        "tags": "drying, flat-dry, rack, knitwear, delicate",
    },
    {
        "id": "p006",
        "name": "Stainless Clothes Hanger Set (10pcs)",
        "desc": "Rust-proof stainless hangers. No sharp edges that snag synthetic fabric.",
        "price": "Rp 55.000",
        "shopUrl": "https://tokopedia.com",
        "img": "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=300&q=80",
        "tags": "drying, hanging, hanger, stainless, line-dry",
    },
    {
        "id": "p007",
        "name": "Velvet Padded Hanger Set (5pcs)",
        "desc": "Contoured velvet hangers that grip fabric without stretching shoulders. Ideal for blazers and coats.",
        "price": "Rp 75.000",
        "shopUrl": "https://shopee.co.id",
        "img": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=300&q=80",
        "tags": "storage, hanger, velvet, blazer, coat, jacket",
    },
    {
        "id": "p008",
        "name": "Vacuum Storage Bag (3pcs)",
        "desc": "Airtight compression bags. Removes humidity and prevents mildew during long-term storage.",
        "price": "Rp 65.000",
        "shopUrl": "https://tokopedia.com",
        "img": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&q=80",
        "tags": "storage, fold, vacuum, bag, humidity, mildew",
    },
    {
        "id": "p009",
        "name": "Cedar Wood Block Set",
        "desc": "Natural cedar repels moths and absorbs moisture. Safe for all fabrics, no chemical residue.",
        "price": "Rp 48.000",
        "shopUrl": "https://shopee.co.id",
        "img": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=300&q=80",
        "tags": "storage, cedar, moth, moisture, all fabrics",
    },
    {
        "id": "p010",
        "name": "UV-Blocking Garment Bag",
        "desc": "Breathable cover that blocks UV rays. Prevents color fading for garments stored near windows.",
        "price": "Rp 85.000",
        "shopUrl": "https://tokopedia.com",
        "img": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=300&q=80",
        "tags": "storage, UV, garment bag, fading, color protection",
    },
]

def _build_product_catalog_text() -> str:
    """Serializes PRODUCT_CATALOG into a concise text block for the system prompt."""
    lines = []
    for p in PRODUCT_CATALOG:
        lines.append(
            f"- [{p['name']}]({p['shopUrl']}) | {p['price']} | {p['desc']} | img: {p['img']} | Tags: {p['tags']}"
        )
    return "\n".join(lines)

_PRODUCT_CATALOG_TEXT: str = _build_product_catalog_text()

SYSTEM_PROMPT: str = f"""<system_intent>
You are the "FABCARE Technical Advisor," an elite, empathetic, and highly precise AI garment-care specialist. Your mission is to help middle-class users protect their investments in expensive clothing, optimize garment lifespans, and reduce textile waste in alignment with SDG 12 (Responsible Consumption and Production).
</system_intent>

<user_profile>
Target Audience: Middle-class individuals who own high-end, luxury, or delicate clothing but lack technical knowledge on textile maintenance. 
Language & Persona Protocol:
- Dynamic Code-Switching: Respond in the language the user uses. If they speak Indonesian, respond in Indonesian. If they speak English, respond in English. 
- Tone: Warm, elite yet accessible, clear, and practical.
- Vocabulary Restriction: Avoid dense, intimidating textile jargon in both languages. Use everyday, simple English (e.g., use "avoid twisting the fabric" instead of "minimize torsional stress"). Mixed Indonesian-English phrases (Code-mixing) common in Indonesian urban culture are highly acceptable if it makes the user feel understood.
</user_profile>

<operational_phases>
You must strictly execute your assistance in two distinct sequential phases. Do not blend them.

CRITICAL RULE: Evaluate the user's query and the available Digital Vault data. If there is ANY ambiguity regarding the specific clothing item, stain type, current washing setup, or material condition, you MUST remain in Phase 1.

---
PHASE 1: AMBIGUITY ERADICATION & DATA GATHERING
- Goal: Collect missing context to ensure the advice given does not ruin an expensive garment.
- Action: Ask 1 to 3 highly targeted, simple questions. 
- Language execution: If the user asks in English, ask in simple English. If Indonesian, ask in Indonesian.
- Sample Focus (English): "Which item from your vault are we treating?", "What kind of stain is it?", or "Are you washing by hand or using a machine?"
- Sample Focus (Indonesian): "Pakaian yang mana dari vault yang mau dirawat?", "Nodanya karena apa?", atau "Nyuci pakai tangan atau mesin?"
- Behavior: Do NOT give step-by-step treatment instructions yet. Gently explain *why* you need this information first to protect their luxury item.

---
PHASE 2: EXECUTION & CARE INSTRUCTION
- Goal: Provide a seamless, premium, step-by-step garment maintenance prescription.
- Action: When ambiguity is zero, output a structured guide covering the following facets as applicable:
  1. Fabric Colour Classification (e.g., separate lights from darks)
  2. Restricted Substances (Explicitly warn against harmful agents like harsh bleaches or specific softeners that ruin delicate fibers).
  3. Water Temperature Restrictions (Specify exact Celsius limits, e.g., "Max 30°C / Maksimal 30°C").
  4. Cycle Mechanical Action Tolerances (Translate to machine settings, e.g., Use 'Delicates/Handwash' cycle, do not use 'Heavy Duty').
  5. Drying Method (e.g., flat air-dry, avoid direct sunlight).
  6. Saving/Storing Method (e.g., hang on padded hangers vs. fold to prevent stretching).
</operational_phases>

<negative_constraints>
- HALO-1: NEVER give a washing instruction if the fabric type is unknown or ambiguous. Fallback to Phase 1 immediately.
- HALO-2: NEVER use overly technical textile engineering terms (e.g., avoid "tensile strength degradation" or "colorfastness rating"; use simple terms like "fabric will stretch" or "color might fade").
- HALO-3: Do not use complex English idioms or native metaphors that an Indonesian speaker might find confusing. Stick to simple, direct vocabulary.
- HALO-4: When recommending products, you MUST only use items listed in the <product_catalog> below. Always present each product in this exact format:
  1. A product image using markdown: ![Product Name](img_url)
  2. A clickable link: **[Product Name](shopUrl)** — Price — short benefit.
  Never invent product names, prices, img URLs, or shopUrls not in the catalog.
</negative_constraints>

<product_catalog>
The following products are available for recommendation. Match them to the garment's fabric type, color group, and treatment stage (washing, drying, or storing). Always include the clickable link and price.

{_PRODUCT_CATALOG_TEXT}
</product_catalog>"""


# ── Database Initialization ──────────────────────────────────────────────────
def init_db() -> None:
    """Creates the SQLite tables if they do not exist."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute('''CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            title TEXT,
            updated_at REAL
        )''')
        conn.execute('''CREATE TABLE IF NOT EXISTS messages (
            message_id TEXT PRIMARY KEY,
            session_id TEXT,
            role TEXT,
            content TEXT,
            created_at REAL,
            FOREIGN KEY(session_id) REFERENCES sessions(session_id)
        )''')
        conn.commit()
    logger.info("SQLite Vault initialized.")


# ── Lifespan ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    init_db()
    if not GROQ_API_KEY:
        logger.warning("GROQ_API_KEY is missing. Set it before querying.")
    else:
        logger.info("GROQ_API_KEY detected. Backend ready.")

    app.state.http_client = httpx.AsyncClient(
        timeout=httpx.Timeout(REQUEST_TIMEOUT_SECONDS),
        headers={
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json",
        },
    )
    yield
    await app.state.http_client.aclose()


app = FastAPI(title="Velour Wardrobe Concierge API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

_static_dir = Path(__file__).parent
if _static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(_static_dir)), name="static")


def _encode_image_to_base64(raw_bytes: bytes, mime_type: str) -> str:
    encoded = base64.b64encode(raw_bytes).decode("utf-8")
    return f"data:{mime_type};base64,{encoded}"

def _build_user_content(text: Optional[str], image_data_uris: List[str], garment_context: Optional[str] = None) -> List[Dict]:
    content: List[Dict] = []
    for data_uri in image_data_uris:
        content.append({"type": "image_url", "image_url": {"url": data_uri}})
    user_text = text.strip() if text else ""
    if not user_text:
        user_text = "Analyze this garment and recommend a care protocol." if image_data_uris else "Hello."
    # Prepend vault garment context when provided so the LLM has precise item data
    if garment_context and garment_context.strip():
        user_text = f"[Vault Garment Context — use this data for hyper-tailored advice]\n{garment_context.strip()}\n\n{user_text}"
    content.append({"type": "text", "text": user_text})
    return content

def _build_conversation_messages(history: List[Dict], user_content: List[Dict]) -> List[Dict]:
    messages: List[Dict] = [{"role": "system", "content": SYSTEM_PROMPT}]
    for turn in history:
        role = turn.get("role", "user")
        content_str = turn.get("content", "").strip()
        if role in {"user", "assistant"} and content_str:
            messages.append({"role": role, "content": content_str})
    messages.append({"role": "user", "content": user_content})
    return messages


async def _stream_groq_response(client: httpx.AsyncClient, payload: dict, session_id: str) -> AsyncIterator[str]:
    """Streams response to frontend and saves final message to SQLite."""
    accumulated_text = ""
    yield f"data: {json.dumps({'session_id': session_id, 'token': ''})}\n\n"

    try:
        async with client.stream("POST", GROQ_CHAT_ENDPOINT, json=payload) as response:
            if response.status_code != 200:
                yield f"data: {json.dumps({'token': f'[Error {response.status_code}]'})}\n\n"
                yield "data: [DONE]\n\n"
                return

            async for raw_line in response.aiter_lines():
                raw_line = raw_line.strip()
                if not raw_line or not raw_line.startswith("data: "): continue
                json_str = raw_line[6:]
                if json_str == "[DONE]": break

                try:
                    chunk = json.loads(json_str)
                    token = chunk.get("choices", [{}])[0].get("delta", {}).get("content") or ""
                    if token:
                        accumulated_text += token
                        yield f"data: {json.dumps({'token': token})}\n\n"
                except json.JSONDecodeError:
                    continue

    except Exception as exc:
        logger.exception(f"Stream error: {exc}")
        yield f"data: {json.dumps({'token': '[Connection error]'})}\n\n"

    finally:
        if accumulated_text:
            with sqlite3.connect(DB_PATH) as conn:
                conn.execute("INSERT INTO messages (message_id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
                             (str(uuid.uuid4()), session_id, "assistant", accumulated_text, time.time()))
                conn.execute("UPDATE sessions SET updated_at = ? WHERE session_id = ?", (time.time(), session_id))
                conn.commit()
        yield "data: [DONE]\n\n"


# ── Core Endpoints ────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse, include_in_schema=False)
async def serve_index():
    index_path = Path(__file__).parent / "index.html"
    return HTMLResponse(content=index_path.read_text(encoding="utf-8")) if index_path.exists() else HTMLResponse("Frontend not found")


@app.get("/chat.html", response_class=HTMLResponse, include_in_schema=False)
async def serve_chat():
    """Serve the chat interface frontend SPA."""
    chat_path = Path(__file__).parent / "chat.html"
    return HTMLResponse(content=chat_path.read_text(encoding="utf-8")) if chat_path.exists() else HTMLResponse("Chat frontend not found")


@app.get("/api/sessions", tags=["Storage"])
async def get_sessions() -> List[Dict[str, Any]]:
    """Fetch all archived consultation sessions for the sidebar."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("SELECT * FROM sessions ORDER BY updated_at DESC")
        return [dict(r) for r in cur.fetchall()]


@app.get("/api/sessions/{session_id}", tags=["Storage"])
async def get_session_history(session_id: str) -> List[Dict[str, Any]]:
    """Fetch exact message history for a specific consultation."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC", (session_id,))
        return [dict(r) for r in cur.fetchall()]


@app.delete("/api/sessions/{session_id}", tags=["Storage"])
async def delete_session(session_id: str) -> JSONResponse:
    """Hard delete a consultation session and all associated messages."""
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
        cur.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))
        conn.commit()
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Session not found")
            
    logger.info(f"Deleted session: {session_id}")
    return JSONResponse(content={"status": "deleted", "session_id": session_id})


@app.post("/api/analyze-garment", tags=["AI"])
async def analyze_garment(
    request: Request,
    image: UploadFile = File(...),
) -> JSONResponse:
    """
    Accepts a single garment photo and returns structured metadata:
    { brand, type, color, confidence } extracted by Llama 4 Scout vision.
    Returns null values when the field cannot be determined with confidence.
    """
    if not GROQ_API_KEY:
        raise HTTPException(status_code=503, detail="Missing API Key")

    raw_bytes = await image.read()
    if len(raw_bytes) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="Image too large")

    ext = Path(image.filename or "").suffix.lower()
    c_type = image.content_type if image.content_type in ACCEPTED_MIME_TYPES else {
        "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
        "webp": "image/webp", "gif": "image/gif"
    }.get(ext.replace(".", ""), "image/jpeg")

    image_data_uri = _encode_image_to_base64(raw_bytes, c_type)

    # Canonical type values the frontend accepts
    VALID_TYPES: set[str] = {
        "jacket", "blazer", "coat", "shirt", "t-shirt",
        "trousers", "jeans", "shoes", "belt", "accessory",
    }

    # Normalization map: common LLM variant → canonical value.
    # Catches near-misses before the strict set check.
    TYPE_NORMALIZE: dict[str, str] = {
        # jacket family
        "windbreaker": "jacket", "bomber": "jacket", "varsity": "jacket",
        "denim jacket": "jacket", "leather jacket": "jacket",
        "sport jacket": "jacket", "sports jacket": "jacket",
        # blazer / coat family
        "suit jacket": "blazer", "sport coat": "blazer", "sportscoat": "blazer",
        "overcoat": "coat", "trench coat": "coat", "trench": "coat",
        "parka": "coat", "raincoat": "coat", "peacoat": "coat",
        # shirt / tee family
        "polo": "shirt", "polo shirt": "shirt", "dress shirt": "shirt",
        "button-up": "shirt", "button-down": "shirt", "oxford shirt": "shirt",
        "top": "shirt",
        "tee": "t-shirt", "tee shirt": "t-shirt", "tshirt": "t-shirt",
        "graphic tee": "t-shirt", "tank top": "t-shirt",
        # trousers / jeans family
        "pants": "trousers", "slacks": "trousers", "chinos": "trousers",
        "dress pants": "trousers", "dress trousers": "trousers",
        "shorts": "trousers",
        "denim": "jeans", "denim pants": "jeans",
        # shoes family
        "sneakers": "shoes", "sneaker": "shoes", "boots": "shoes",
        "boot": "shoes", "loafers": "shoes", "loafer": "shoes",
        "sandals": "shoes", "sandal": "shoes", "heels": "shoes",
        "oxford": "shoes", "oxfords": "shoes",
        # accessories
        "scarf": "accessory", "hat": "accessory", "cap": "accessory",
        "bag": "accessory", "watch": "accessory", "tie": "accessory",
        "gloves": "accessory", "sunglasses": "accessory",
        "wallet": "accessory", "purse": "accessory",
    }

    def _normalize_type(raw: str | None) -> str | None:
        """Lower-case, strip, check canonical set, then try normalization map."""
        if not isinstance(raw, str):
            return None
        cleaned = raw.strip().lower()
        if cleaned in VALID_TYPES:
            return cleaned
        return TYPE_NORMALIZE.get(cleaned)

    # Strict extraction system prompt — forces clean JSON output only
    extraction_system = (
        "You are a garment metadata extraction engine. "
        "Analyze the provided image and return ONLY a valid JSON object with exactly these keys: "
        "\"unrecognized\", \"brand\", \"type\", \"color\". "
        "Rules:\n"
        "- unrecognized: Set to true if the image does not clearly show a wearable clothing item "
        "(e.g. the image is blurry, too dark, not clothing, a random object, a face, a landscape, "
        "or otherwise unusable for garment identification). Set to false if a garment is visible.\n"
        "- brand: The clothing brand name if a logo/label is clearly visible (e.g. \"Nike\", \"Zara\"). "
        "If brand is not visible or unclear, return null.\n"
        "- type: You MUST return one of these exact lowercase strings and nothing else: "
        "\"jacket\", \"blazer\", \"coat\", \"shirt\", \"t-shirt\", \"trousers\", \"jeans\", "
        "\"shoes\", \"belt\", \"accessory\". "
        "Mapping rules: polo/button-down/dress shirt → \"shirt\"; tee/graphic top → \"t-shirt\"; "
        "pants/chinos/slacks → \"trousers\"; sneakers/boots/loafers → \"shoes\"; "
        "bomber/windbreaker → \"jacket\"; trench/overcoat/parka → \"coat\"; "
        "scarf/hat/watch/bag → \"accessory\". "
        "Do NOT invent other values. If you cannot map the item to one of these, return null.\n"
        "- color: The primary color of the garment as a descriptive string (e.g. \"Midnight Navy\", "
        "\"Ivory White\", \"Charcoal Grey\"). Be specific and elegant. If unclear, return null.\n"
        "Output ONLY the raw JSON object. No markdown, no backticks, no explanation.\n"
        "Examples:\n"
        "{\"unrecognized\": false, \"brand\": \"Nike\", \"type\": \"t-shirt\", \"color\": \"Classic Black\"}\n"
        "{\"unrecognized\": false, \"brand\": null, \"type\": \"trousers\", \"color\": \"Charcoal Grey\"}\n"
        "{\"unrecognized\": true, \"brand\": null, \"type\": null, \"color\": null}"
    )

    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": extraction_system},
            {"role": "user", "content": [
                {"type": "image_url", "image_url": {"url": image_data_uri}},
                {"type": "text", "text": "Extract the garment metadata from this image."}
            ]}
        ],
        "max_tokens": 120,
        "temperature": 0.0,  # zero temperature — deterministic enum selection
        "stream": False,
    }

    try:
        client: httpx.AsyncClient = request.app.state.http_client
        response = await client.post(GROQ_CHAT_ENDPOINT, json=payload)

        # Surface upstream HTTP errors with their actual status code so the
        # frontend can distinguish "API key dead" (403) from a real 500.
        if response.status_code == 401 or response.status_code == 403:
            logger.error(f"Groq auth error {response.status_code} — check GROQ_API_KEY")
            raise HTTPException(status_code=403, detail="Groq API key invalid or expired")
        if response.status_code == 429:
            logger.warning("Groq rate limit hit on analyze-garment")
            raise HTTPException(status_code=429, detail="AI analysis rate limit — try again shortly")
        response.raise_for_status()

        data = response.json()
        raw_text = data["choices"][0]["message"]["content"].strip()

        # Strip markdown fences if the model disobeys
        raw_text = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_text, flags=re.MULTILINE).strip()

        result = json.loads(raw_text)

        is_unrecognized = bool(result.get("unrecognized", False))
        normalized_type = _normalize_type(result.get("type")) if not is_unrecognized else None

        logger.info(
            f"[analyze-garment] raw_type={result.get('type')!r} → normalized={normalized_type!r} "
            f"unrecognized={is_unrecognized}"
        )

        return JSONResponse(content={
            "unrecognized": is_unrecognized,
            "brand": result.get("brand") if not is_unrecognized else None,
            "type":  normalized_type,
            "color": result.get("color") if not is_unrecognized else None,
        })
    except HTTPException:
        raise  # re-raise our explicit status codes unchanged
    except json.JSONDecodeError as e:
        logger.warning(f"Garment analysis JSON parse failed: {e} | raw: {raw_text!r}")
        return JSONResponse(content={"unrecognized": True, "brand": None, "type": None, "color": None})
    except Exception as e:
        logger.exception(f"Garment analysis error: {e}")
        raise HTTPException(status_code=500, detail="Analysis failed")


@app.post("/api/chat", tags=["Chat"])
async def chat_endpoint(
    request: Request,
    text: Optional[str] = Form(default=None),
    history: Optional[str] = Form(default=None),
    session_id: Optional[str] = Form(default=None)
) -> StreamingResponse:
    
    if not GROQ_API_KEY: raise HTTPException(status_code=503, detail="Missing API Key")

    form = await request.form()
    image_fields = [form[k] for k in form.keys() if re.match(r"^image_\d+$", k) and isinstance(form[k], UploadFile)]
    if len(image_fields) > MAX_IMAGES_PER_REQUEST: raise HTTPException(status_code=422, detail="Too many images")

    image_data_uris = []
    for upload in image_fields:
        raw_bytes = await upload.read()
        if len(raw_bytes) > MAX_IMAGE_SIZE_BYTES: raise HTTPException(status_code=413, detail="Image too large")
        ext = Path(upload.filename or "").suffix.lower()
        c_type = upload.content_type if upload.content_type in ACCEPTED_MIME_TYPES else {"jpg":"image/jpeg","png":"image/png"}.get(ext.replace(".",""), "image/jpeg")
        image_data_uris.append(_encode_image_to_base64(raw_bytes, c_type))

    raw_text = form.get("text") or text or ""
    
    active_session = form.get("session_id") or session_id
    if not active_session:
        active_session = str(uuid.uuid4())
        title = raw_text.strip()[:35] + "..." if raw_text.strip() else "Visual Consultation"
        with sqlite3.connect(DB_PATH) as conn:
            conn.execute("INSERT INTO sessions (session_id, title, updated_at) VALUES (?, ?, ?)", (active_session, title, time.time()))
            conn.commit()

    user_save_text = raw_text.strip()
    if image_data_uris:
        user_save_text = f"*[Attached {len(image_data_uris)} image(s)]*\n\n" + (user_save_text or "Visual Analysis Request")

    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("INSERT INTO messages (message_id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
                     (str(uuid.uuid4()), active_session, "user", user_save_text, time.time()))
        conn.commit()

    try:
        parsed_history = json.loads(str(form.get("history") or history))[-20:]
    except:
        parsed_history = []

    raw_garment_context = form.get("garment_context") or ""
    user_content  = _build_user_content(raw_text, image_data_uris, garment_context=str(raw_garment_context) if raw_garment_context else None)
    all_messages  = _build_conversation_messages(parsed_history, user_content)

    groq_payload = {"model": GROQ_MODEL, "messages": all_messages, "max_tokens": MAX_TOKENS, "temperature": 0.4, "stream": True}
    return StreamingResponse(_stream_groq_response(request.app.state.http_client, groq_payload, active_session), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, log_level="info")