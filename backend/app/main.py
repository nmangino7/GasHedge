import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import engine, Base
from app.routers import companies, prices, hedging, reports, deals, ai

app = FastAPI(
    title="GasHedge - Fuel Hedging Portal",
    description="ETF-based fuel hedging advisory platform for small businesses",
    version="1.0.0",
)

_allowed_origins = [
    os.getenv("FRONTEND_URL", "http://localhost:3000"),
    "http://localhost:3000",
    "http://localhost:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables on startup
@app.on_event("startup")
def on_startup():
    os.makedirs("data", exist_ok=True)
    os.makedirs("reports", exist_ok=True)
    Base.metadata.create_all(bind=engine)

# Mount static files for reports
os.makedirs("reports", exist_ok=True)
app.mount("/static/reports", StaticFiles(directory="reports"), name="reports")

# Include routers
app.include_router(companies.router, prefix="/api/companies", tags=["Companies"])
app.include_router(prices.router, prefix="/api/prices", tags=["Prices"])
app.include_router(hedging.router, prefix="/api/hedging", tags=["Hedging"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(deals.router, prefix="/api/deals", tags=["Deals"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI"])


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "GasHedge API"}
