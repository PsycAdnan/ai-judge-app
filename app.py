import os
import io
import json
import base64
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from PIL import Image
from google import genai

load_dotenv()

# --- Configuration ---
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_DIM = 1024  # Resize images to this max dimension before sending to AI

# --- App Setup ---
app = FastAPI(title="AI Judge – Roast Me")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# --- Gemini Client ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")


def get_gemini_client():
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")
    return genai.Client(api_key=GEMINI_API_KEY)


# --- AI Prompt ---
ROAST_PROMPT = """You are "AI Judge", a hilarious and witty roast comedian AI. You analyze photos and generate funny, playful roasts about someone's vibe, energy, or appearance.

ANALYZE the photo for:
- Facial expression & mood
- Hairstyle & grooming
- Glasses or accessories
- Clothing & style choices
- Background context & setting
- Overall vibe & energy

RULES:
1. Be FUNNY, witty, and meme-style humorous
2. Keep it PLAYFUL - like roasting a friend, not bullying
3. NEVER mention or target: race, ethnicity, skin color, religion, disability, gender, sexuality, body weight, or age in a negative way
4. Roasts should feel like they come from internet/meme culture
5. Keep roasts to 1-2 SHORT sentences max
6. The verdict should be a funny 2-4 word title (like a meme verdict)

RESPOND with ONLY valid JSON (no markdown, no code blocks):
{
  "verdict": "A funny 2-4 word verdict title",
  "roast": "Your 1-2 sentence playful roast here",
  "level": "Mild" or "Medium" or "Brutal"
}

Choose the roast level based on how strong/savage the roast is:
- Mild: Light teasing, gentle humor
- Medium: Solid burns, witty observations  
- Brutal: Maximum savagery (but still safe and playful)

Generate a roast NOW for this photo:"""


def optimize_image(image_bytes: bytes) -> bytes:
    """Resize and compress image for faster AI processing."""
    img = Image.open(io.BytesIO(image_bytes))

    # Convert RGBA to RGB if necessary
    if img.mode == "RGBA":
        bg = Image.new("RGB", img.size, (255, 255, 255))
        bg.paste(img, mask=img.split()[3])
        img = bg
    elif img.mode != "RGB":
        img = img.convert("RGB")

    # Resize if larger than max dimension
    if max(img.size) > MAX_IMAGE_DIM:
        img.thumbnail((MAX_IMAGE_DIM, MAX_IMAGE_DIM), Image.LANCZOS)

    # Save as JPEG with moderate quality
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=80, optimize=True)
    return buf.getvalue()


def parse_roast_response(text: str) -> dict:
    """Parse the AI response, handling potential formatting issues."""
    # Strip markdown code blocks if present
    cleaned = text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        # Remove first and last lines (code block markers)
        lines = [l for l in lines if not l.strip().startswith("```")]
        cleaned = "\n".join(lines)

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        # Fallback if JSON parsing fails
        return {
            "verdict": "Unreadable Energy",
            "roast": "You broke the AI. That's either impressive or concerning. Probably both.",
            "level": "Medium",
        }

    # Validate required fields
    verdict = data.get("verdict", "Mystery Vibes")
    roast = data.get("roast", "The AI is speechless. That says a lot.")
    level = data.get("level", "Medium")

    if level not in ("Mild", "Medium", "Brutal"):
        level = "Medium"

    return {"verdict": verdict, "roast": roast, "level": level}


# --- Routes ---
@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/api/roast")
async def roast(file: UploadFile = File(...)):
    # Validate content type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Please upload a JPEG, PNG, or WebP image.",
        )

    # Read and validate size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File too large. Maximum size is 5MB.",
        )

    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")

    # Optimize image
    try:
        optimized = optimize_image(contents)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Could not process image. Please upload a valid photo.",
        )

    # Create base64 for returning to frontend (for meme generation)
    img_b64 = base64.b64encode(optimized).decode("utf-8")

    # Send to Gemini Vision
    try:
        client = get_gemini_client()
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[
                ROAST_PROMPT,
                {
                    "inline_data": {
                        "mime_type": "image/jpeg",
                        "data": img_b64,
                    }
                },
            ],
        )

        result = parse_roast_response(response.text)

    except HTTPException:
        raise
    except Exception as e:
        error_str = str(e)
        print(f"Gemini API error: {error_str}")

        if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
            detail = "Rate limit hit! The AI needs a breather. Wait 30 seconds and try again. 🫠"
        elif "API_KEY" in error_str or "401" in error_str or "403" in error_str:
            detail = "API key issue! Make sure GEMINI_API_KEY is set correctly in your .env file."
        elif "not configured" in error_str:
            detail = "No API key found. Create a .env file with GEMINI_API_KEY=your_key_here"
        else:
            detail = f"AI hiccup! Please try again in a moment. ({type(e).__name__})"

        raise HTTPException(status_code=500, detail=detail)

    return JSONResponse(
        {
            "verdict": result["verdict"],
            "roast": result["roast"],
            "level": result["level"],
            "image": f"data:image/jpeg;base64,{img_b64}",
        }
    )


# --- Run ---
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
