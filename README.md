# AI Judge ⚖️ – Roast Me

A lightweight, viral web application where you upload a selfie and AI generates a funny, playful roast about your vibe.

## Quick Start

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Set up environment

```bash
# Copy the example env file
cp .env.example .env

# Edit .env and add your Gemini API key
# Get one free at https://aistudio.google.com
```

### 3. Run the app

```bash
python app.py
```

Open [http://localhost:8000](http://localhost:8000) in your browser.

## Features

- 📸 Upload a selfie and get a hilarious AI roast
- 🎯 Three roast levels: Mild, Medium, Brutal
- 📥 Download your roast as a meme image
- 📤 Share to WhatsApp, Twitter/X, or copy to clipboard
- 🔁 Roast Again for endless fun
- 📱 Mobile-first dark theme design
- ⚡ Lightweight and fast

## Tech Stack

- **Backend:** Python (FastAPI)
- **Frontend:** HTML + CSS + JavaScript
- **AI:** Google Gemini 2.0 Flash (Vision)

## Project Structure

```
├── app.py                 # FastAPI backend
├── requirements.txt       # Python dependencies
├── .env.example           # Environment template
├── static/
│   ├── css/style.css      # Dark theme styles
│   ├── js/app.js          # Frontend logic
│   └── images/logo.svg    # Logo
└── templates/
    └── index.html         # Main page
```
