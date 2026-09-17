# ANTARBODH Frontend

Frontend application for **ANTARBODH: AI-Powered Subsurface Ocean Intelligence**.

## Architecture & Responsibilities

The frontend is built with React, TypeScript, and Vite. It serves as the visualization and interaction layer. 
It **does not** compute predictions, interpolate fields, or mock data. All data is fetched from the FastAPI backend.

There are two primary user experiences:
- `/explore`: **Historical 2025 Scientific Exploration**. View the existing cached 2025 dataset predictions interactively.
- `/predict`: **On-Demand Date + Location Model Prediction**. Request specific predictions via date and coordinates.

## Installation

```bash
cd frontend
npm install
```

## Configuration

Copy `.env.example` to `.env.local` and set your backend URL:
```env
VITE_API_BASE_URL=http://localhost:8000
```

## Running the Application

To start the frontend development server:
```bash
npm run dev
```

To run the backend dependency (from the project root):
```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Technical Constraints

- **No Map API Keys:** The implementation intentionally avoids CARTO, Mapbox, or Google Maps API keys to support local/offline demonstrations.
- **Strict Typing:** All API responses are strongly typed matching the FastAPI schemas exactly.
- **Vanilla CSS:** Design tokens are defined in `styles/tokens.css` ensuring a customized scientific aesthetic without massive UI libraries.
