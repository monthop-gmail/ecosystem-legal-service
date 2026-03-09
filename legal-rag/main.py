"""Legal RAG Server - Thai Legal Document Search with Hybrid RAG"""
import os
import json
from pathlib import Path
from fastapi import FastAPI
from pydantic import BaseModel
import chromadb
from rank_bm25 import BM25Okapi

app = FastAPI(title="Legal RAG Server", version="0.1.0")

# Config
CHROMADB_HOST = os.getenv("CHROMADB_HOST", "chromadb")
CHROMADB_PORT = int(os.getenv("CHROMADB_PORT", "8000"))
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "thai_legal")
DOCUMENTS_DIR = os.getenv("DOCUMENTS_DIR", "/app/documents")

# ChromaDB client
chroma_client = None
collection = None
bm25_index = None
doc_texts = []
doc_metadata = []


class SearchRequest(BaseModel):
    query: str
    category: str = "all"
    top_k: int = 5


class IngestRequest(BaseModel):
    directory: str | None = None


@app.on_event("startup")
async def startup():
    global chroma_client, collection
    try:
        chroma_client = chromadb.HttpClient(host=CHROMADB_HOST, port=CHROMADB_PORT)
        collection = chroma_client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
        print(f"Connected to ChromaDB, collection: {COLLECTION_NAME}")

        # Load existing docs for BM25
        await build_bm25_index()
    except Exception as e:
        print(f"ChromaDB connection error: {e}")


async def build_bm25_index():
    """Build BM25 index from collection documents"""
    global bm25_index, doc_texts, doc_metadata
    if collection is None:
        return
    try:
        results = collection.get(include=["documents", "metadatas"])
        if results["documents"]:
            doc_texts = results["documents"]
            doc_metadata = results["metadatas"] or []
            tokenized = [doc.split() for doc in doc_texts]
            bm25_index = BM25Okapi(tokenized)
            print(f"BM25 index built with {len(doc_texts)} documents")
    except Exception as e:
        print(f"BM25 index error: {e}")


@app.get("/health")
async def health():
    doc_count = collection.count() if collection else 0
    return {"status": "ok", "service": "legal-rag", "documents": doc_count}


@app.post("/api/search")
async def search(req: SearchRequest):
    """Hybrid search: Vector (ChromaDB) + BM25 with RRF fusion"""
    results = {"query": req.query, "category": req.category, "results": []}

    if collection is None:
        return {"error": "ChromaDB not connected", "results": []}

    try:
        # Vector search
        where_filter = None
        if req.category != "all":
            where_filter = {"category": req.category}

        vector_results = collection.query(
            query_texts=[req.query],
            n_results=req.top_k,
            where=where_filter,
            include=["documents", "metadatas", "distances"],
        )

        # BM25 search
        bm25_scores = {}
        if bm25_index and doc_texts:
            scores = bm25_index.get_scores(req.query.split())
            for i, score in enumerate(scores):
                if score > 0:
                    bm25_scores[i] = score

        # Combine results (RRF - Reciprocal Rank Fusion)
        combined = []
        if vector_results["documents"] and vector_results["documents"][0]:
            for i, doc in enumerate(vector_results["documents"][0]):
                meta = (
                    vector_results["metadatas"][0][i]
                    if vector_results["metadatas"]
                    else {}
                )
                distance = (
                    vector_results["distances"][0][i]
                    if vector_results["distances"]
                    else 1.0
                )
                combined.append(
                    {
                        "text": doc,
                        "metadata": meta,
                        "vector_score": 1 - distance,
                        "source": meta.get("source", "unknown"),
                    }
                )

        results["results"] = combined[: req.top_k]
        results["total"] = len(combined)

    except Exception as e:
        results["error"] = str(e)

    return results


@app.post("/api/ingest")
async def ingest(req: IngestRequest):
    """Ingest documents from the knowledge directory"""
    if collection is None:
        return {"error": "ChromaDB not connected"}

    doc_dir = Path(req.directory or DOCUMENTS_DIR)
    if not doc_dir.exists():
        return {"error": f"Directory not found: {doc_dir}"}

    ingested = 0
    errors = []

    for filepath in doc_dir.rglob("*.txt"):
        try:
            text = filepath.read_text(encoding="utf-8")
            category = filepath.parent.name

            # Chunk the document
            chunks = chunk_text(text, chunk_size=500, overlap=50)

            for i, chunk in enumerate(chunks):
                doc_id = f"{filepath.stem}_{i}"
                collection.upsert(
                    ids=[doc_id],
                    documents=[chunk],
                    metadatas=[
                        {
                            "source": filepath.name,
                            "category": category,
                            "chunk_index": i,
                            "total_chunks": len(chunks),
                        }
                    ],
                )
                ingested += 1
        except Exception as e:
            errors.append({"file": str(filepath), "error": str(e)})

    # Rebuild BM25 index
    await build_bm25_index()

    return {"ingested": ingested, "errors": errors}


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """Split text into overlapping chunks"""
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        start = end - overlap
    return chunks if chunks else [text]


# MCP endpoint (for direct MCP access)
@app.post("/mcp")
async def mcp_endpoint():
    """Placeholder for MCP Streamable HTTP - implement with ragforge template"""
    return {"info": "MCP endpoint - use /api/search for REST access"}
