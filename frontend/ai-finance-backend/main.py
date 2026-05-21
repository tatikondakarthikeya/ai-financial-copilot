from fastapi import FastAPI

app = FastAPI(title="AI Financial Copilot API")

@app.get("/")
async def root():
    return {"message": "Welcome to AI Financial Copilot API"}
