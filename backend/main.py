from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline

app = FastAPI(title="SentiScope Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"chrome-extension://.*|http://localhost(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODELS = {
    "twitter": "Ganesh1912/sentiscope-distilbert-twitter",
    "reddit": "Ganesh1912/sentiscope-distilbert-reddit",
    "linkedin": "Ganesh1912/sentiscope-distilbert-linkedin",
    "broad": "Ganesh1912/sentiscope-roberta-broad",
}

pipes = {}

class AnalyzeRequest(BaseModel):
    text: str
    platform: str = "broad"

@app.on_event("startup")
def load_models():
    for name, model_id in MODELS.items():
        pipes[name] = pipeline(
            "text-classification",
            model=model_id,
            tokenizer=model_id
        )

@app.get("/")
def root():
    return {"message": "SentiScope backend is running"}

@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    text = req.text.strip()
    platform = req.platform if req.platform in MODELS else "broad"

    if len(text) < 5:
        raise HTTPException(status_code=400, detail="Text too short")

    try:
        result = pipes[platform](text[:512], top_k=None)

        if isinstance(result, list) and len(result) > 0 and isinstance(result[0], list):
            scores = result[0]
        elif isinstance(result, list):
            scores = result
        elif isinstance(result, dict):
            scores = [result]
        else:
            scores = []

        return {
            "ok": True,
            "platform": platform,
            "model": MODELS[platform],
            "data": scores
        }
    except Exception as e:
        return {
            "ok": False,
            "error": str(e)
        }