from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.responses import Response
import os

app = FastAPI(
    title="Dynamic Graph Explorer API",
    description="Alluvial と Graph Layout が連動する可視化プログラムのバックエンドAPI",
    version="1.0.0",
)

# CORS設定を強化
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.jsフロントエンド
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# データディレクトリの絶対パスを設定
current_dir = os.path.dirname(os.path.abspath(__file__))
data_dir = os.path.join(current_dir, "..", "data")


@app.get("/")
async def root():
    return {"message": "Dynamic Graph Explorer API"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# CSVファイルを読み込んでCORS対応のレスポンスを返す関数
async def get_csv_response(file_path: str, filename: str):
    try:
        if os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            return Response(
                content=content,
                media_type="text/csv",
                headers={
                    "Content-Disposition": f"attachment; filename={filename}",
                    "Access-Control-Allow-Origin": "http://localhost:3000",
                    "Access-Control-Allow-Methods": "GET",
                    "Access-Control-Allow-Headers": "*",
                },
            )
        else:
            return {"error": f"{filename} not found"}
    except Exception as e:
        return {"error": f"Error reading {filename}: {str(e)}"}


# データエンドポイント
@app.get("/data/nodes")
async def get_nodes():
    """ノードデータを取得"""
    return await get_csv_response(os.path.join(data_dir, "nodes.csv"), "nodes.csv")


@app.get("/data/edges")
async def get_edges():
    """エッジデータを取得"""
    return await get_csv_response(os.path.join(data_dir, "edges.csv"), "edges.csv")


@app.get("/data/alluvial-nodes")
async def get_alluvial_nodes():
    """Alluvialノードデータを取得"""
    return await get_csv_response(
        os.path.join(data_dir, "alluvial_nodes.csv"), "alluvial_nodes.csv"
    )


@app.get("/data/alluvial-links")
async def get_alluvial_links():
    """Alluvial遷移データを取得"""
    return await get_csv_response(
        os.path.join(data_dir, "alluvial_links.csv"), "alluvial_links.csv"
    )


if __name__ == "__main__":
    import uvicorn

    print(f"Starting server with data_dir: {data_dir}")
    uvicorn.run(app, host="0.0.0.0", port=8000)
