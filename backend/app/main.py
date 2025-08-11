from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

app = FastAPI(
    title="Dynamic Graph Explorer API",
    description="Alluvial と Graph Layout が連動する可視化プログラムのバックエンドAPI",
    version="1.0.0"
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.jsフロントエンド
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静的ファイル配信（CSVデータ）
app.mount("/data", StaticFiles(directory="data"), name="data")

@app.get("/")
async def root():
    return {"message": "Dynamic Graph Explorer API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# データエンドポイント
@app.get("/data/nodes")
async def get_nodes():
    """ノードデータを取得"""
    try:
        return FileResponse("data/nodes.csv", media_type="text/csv")
    except FileNotFoundError:
        return {"error": "nodes.csv not found"}

@app.get("/data/edges")
async def get_edges():
    """エッジデータを取得"""
    try:
        return FileResponse("data/edges.csv", media_type="text/csv")
    except FileNotFoundError:
        return {"error": "edges.csv not found"}

@app.get("/data/alluvial-nodes")
async def get_alluvial_nodes():
    """Alluvialノードデータを取得"""
    try:
        return FileResponse("data/alluvial_nodes.csv", media_type="text/csv")
    except FileNotFoundError:
        return {"error": "alluvial_nodes.csv not found"}

@app.get("/data/alluvial-links")
async def get_alluvial_links():
    """Alluvial遷移データを取得"""
    try:
        return FileResponse("data/alluvial_links.csv", media_type="text/csv")
    except FileNotFoundError:
        return {"error": "alluvial_links.csv not found"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
