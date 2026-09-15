from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .api.routes import health, metadata, validation, availability, prediction, historical, temperature, profile

app = FastAPI(
    title="ANTARBODH Backend API",
    description="API for Historical Cached and On-Demand Subsurface Ocean Temperature Predictions",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(health.router, prefix="/api")
app.include_router(metadata.router, prefix="/api")
app.include_router(validation.router, prefix="/api")
app.include_router(availability.router, prefix="/api")
app.include_router(historical.router, prefix="/api/historical")
app.include_router(prediction.router, prefix="/api/prediction")
app.include_router(temperature.router, prefix="/api")
app.include_router(profile.router, prefix="/api")

@app.on_event("startup")
async def startup_event():
    # We will initialize services here
    pass
