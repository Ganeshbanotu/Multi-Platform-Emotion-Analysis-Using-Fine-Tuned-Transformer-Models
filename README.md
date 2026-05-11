# SentiScope — Multi-Platform Emotion Analysis Using Fine-Tuned Transformer Models

> Analyze emotion in social content across Twitter/X, Reddit, and LinkedIn with a local FastAPI backend and a Manifest V3 Chrome extension.

![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688.svg)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4.svg)

---

## Overview

**SentiScope** is a multi-platform emotion analysis project that combines:

- a **FastAPI backend** for emotion inference,
- a **Chrome extension** for in-browser analysis,
- and a **Transformer-based model pipeline** hosted locally through Hugging Face `transformers`.

The backend loads fine-tuned models for different platforms and exposes a simple `/analyze` API. The extension can automatically scan supported social media posts, attach emotion badges, and also analyze selected text manually.

---

## Features

- Emotion analysis for **Twitter/X**, **Reddit**, and **LinkedIn**
- General-purpose fallback model for broader text
- Local **FastAPI** inference server
- **Chrome extension (Manifest V3)** support
- Auto-scan mode for supported platforms
- Manual text selection analysis
- Floating emotion badge on selected text
- In-page emotion badges on detected posts
- Backend connectivity check from the popup
- CORS configured for Chrome extension and localhost use

---

## How it works

1. The Chrome extension detects text on supported platforms.
2. The extension sends the text to the local backend.
3. The backend runs a Hugging Face transformer pipeline.
4. The emotion scores are returned as JSON.
5. The extension displays the result as a badge in the page.

---

## Repository Structure

```text
.
├── backend
│   ├── main.py
│   └── requirements.txt
├── extension
│   ├── background.js
│   ├── content.css
│   ├── content.js
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.js
│   └── icons/
├── sentiment-and-emotion-analysis-using-transformers (1).ipynb
├── .gitignore
└── LICENSE
```

---

## Tech Stack

- **Python**
- **FastAPI**
- **Pydantic**
- **Uvicorn**
- **Hugging Face Transformers**
- **PyTorch**
- **Chrome Extension Manifest V3**
- **HTML / CSS / JavaScript**

---

## Backend Models

The backend loads these model IDs:

- `Ganesh1912/sentiscope-distilbert-twitter`
- `Ganesh1912/sentiscope-distilbert-reddit`
- `Ganesh1912/sentiscope-distilbert-linkedin`
- `Ganesh1912/sentiscope-roberta-broad`

These are selected based on the platform passed to the API. The backend also provides a simple health check route at `/`.  

---

## API Endpoints

### `GET /`
Health check.

**Response**
```json
{
  "message": "SentiScope backend is running"
}
```

### `POST /analyze`
Analyze a text string for a given platform.

**Request body**
```json
{
  "text": "I am really excited about this update!",
  "platform": "twitter"
}
```

**Supported platforms**
- `twitter`
- `reddit`
- `linkedin`
- `broad`

**Response**
```json
{
  "ok": true,
  "platform": "twitter",
  "model": "Ganesh1912/sentiscope-distilbert-twitter",
  "data": [
    {
      "label": "joy",
      "score": 0.98
    }
  ]
}
```

If the text is too short, the API returns a 400 error.

---

## Backend Setup

### 1) Go to the backend folder
```bash
cd backend
```

### 2) Create a virtual environment
```bash
python -m venv .venv
```

### 3) Activate it

**Windows**
```bash
.venv\Scripts\activate
```

**macOS / Linux**
```bash
source .venv/bin/activate
```

### 4) Install dependencies
```bash
pip install -r requirements.txt
```

### 5) Run the server
```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Once running, the backend should be available at:

```text
http://127.0.0.1:8000
```

---

## Chrome Extension Setup

### 1) Open Chrome Extensions
Go to:

```text
chrome://extensions
```

### 2) Enable Developer Mode
Turn on **Developer mode** in the top-right corner.

### 3) Load the extension
Click **Load unpacked** and select the `extension/` folder.

### 4) Start the backend first
Make sure the FastAPI server is running on `127.0.0.1:8000`.

### 5) Use the extension on supported sites
Open one of these platforms:

- Twitter/X
- Reddit
- LinkedIn

Then open the extension popup and use:

- **Auto analysis**
- **Re-scan current page**
- **Check backend**

---

## Extension Behavior

### Auto analysis
The extension scans posts on supported pages and attaches emotion badges automatically.

### Manual selection analysis
When you highlight text on a page, the extension can analyze the selected text and show a floating emotion badge.

### Re-scan current page
Clears processed items and scans the current page again.

### Backend check
Verifies that the local backend is reachable before analysis.

---

## Important Notes

- This project expects the backend to run locally on `127.0.0.1:8000`.
- The extension is configured for Twitter/X, Reddit, and LinkedIn host permissions.
- The repo currently contains a Jupyter notebook for experimentation or training workflow.
- The repository uses the **MIT License**.

---

## Troubleshooting

### Backend not reachable
- Confirm the backend is running
- Check that port `8000` is free
- Restart the FastAPI server

### Extension does not analyze posts
- Refresh the social media page after loading the extension
- Make sure the backend is running
- Re-open the popup and test **Check backend**

### No badges appear
- Ensure the page is a supported platform
- Try **Re-scan current page**
- Disable and re-enable **Auto analysis**

### CORS or blocked requests
- Use the backend on `127.0.0.1:8000`
- Keep the extension loaded from Chrome developer mode
- Make sure the site is one of the supported host patterns

---

## Future Improvements

- Add a public deployment option for the backend
- Save analysis history
- Improve model confidence visualization
- Add more supported platforms
- Add a results dashboard
- Add tests and CI

---

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.

---

## Author

**Ganeshbanotu**
