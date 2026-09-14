"""Backend API automated test suite.

Tests all endpoints, boundary conditions, coordinate validation, surface honest SSS missingness,
and validation benchmark responses using FastAPI TestClient.
"""

import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.main import app

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client

def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["project"] == "ANTARBODH"
    assert "version" in data

def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["model_loaded"] is True
    assert data["prediction_data_available"] is True

def test_model_endpoint(client):
    response = client.get("/api/model")
    assert response.status_code == 200
    data = response.json()
    assert data["model_id"] == "antarbodh_cnn_v1_sih2026"
    assert data["input_channels"] == 14
    assert len(data["output_depths"]) == 15
    assert data["domain"]["lat_min"] == 5.0
    assert data["domain"]["lat_max"] == 20.0

def test_metadata_endpoint(client):
    response = client.get("/api/metadata")
    assert response.status_code == 200
    data = response.json()
    assert len(data["supported_dates"]) == 365
    assert len(data["supported_depths"]) == 15
    assert data["resolution_deg"] == 0.25
    assert data["sss_availability"]["available"] is False

def test_temperature_slice_valid(client):
    response = client.get("/api/temperature?date=2025-08-17&depth=100")
    assert response.status_code == 200
    data = response.json()
    assert data["date"] == "2025-08-17"
    assert data["depth"] == 100.0
    assert data["units"] == "°C"
    assert len(data["latitudes"]) == 60
    assert len(data["longitudes"]) == 80
    assert len(data["temperature_grid"]) == 60
    assert len(data["temperature_grid"][0]) == 80
    assert data["min_temp"] is not None
    assert data["max_temp"] is not None
    assert data["min_temp"] < data["max_temp"]

def test_temperature_slice_invalid_date(client):
    response = client.get("/api/temperature?date=2024-05-10&depth=100")
    assert response.status_code == 400
    assert "outside supported 2025 range" in response.json()["detail"]

def test_temperature_slice_invalid_depth(client):
    response = client.get("/api/temperature?date=2025-08-17&depth=999")
    assert response.status_code == 400
    assert "not among canonical depths" in response.json()["detail"]

def test_profile_endpoint_valid_ocean(client):
    response = client.get("/api/profile?date=2025-08-17&lat=15.25&lon=88.75")
    assert response.status_code == 200
    data = response.json()
    assert data["date"] == "2025-08-17"
    assert abs(data["latitude"] - 15.25) < 1e-4
    assert abs(data["longitude"] - 88.75) < 1e-4
    assert len(data["depths"]) == 15
    assert len(data["temperatures"]) == 15
    assert data["is_ocean"] is True
    # Surface temperature should be higher than deep ocean temperature
    assert data["temperatures"][0] > data["temperatures"][-1]

def test_profile_endpoint_out_of_domain(client):
    response = client.get("/api/profile?date=2025-08-17&lat=35.0&lon=88.75")
    assert response.status_code == 400
    assert "outside Bay of Bengal domain" in response.json()["detail"]

def test_surface_endpoint_valid(client):
    response = client.get("/api/surface?date=2025-08-17&lat=15.25&lon=88.75")
    assert response.status_code == 200
    data = response.json()
    assert data["sst"]["available"] is True
    assert 20.0 <= data["sst"]["value"] <= 35.0
    # SSS must be reported as unavailable in 2025 without fabrication
    assert data["sss"]["available"] is False
    assert data["sss"]["value"] is None
    assert "No SSS observation available" in data["sss"]["reason"]
    # Wind and Current
    assert data["current_speed"]["units"] == "m/s"
    assert data["wind_speed"]["units"] == "m/s"

def test_validation_summary_endpoint(client):
    response = client.get("/api/validation")
    assert response.status_code == 200
    data = response.json()
    assert data["model_id"] == "antarbodh_cnn_v1_sih2026"
    assert data["sample"]["common_matched_observations"] == 201942
    assert data["sample"]["matched_profiles"] == 1383
    assert abs(data["antarbodh_vs_argo"]["rmse"] - 0.6218) < 1e-3
    assert abs(data["glorys_vs_argo"]["rmse"] - 0.5521) < 1e-3
    assert abs(data["antarbodh_vs_argo"]["bias"] - 0.0198) < 1e-3

def test_validation_depth_endpoint(client):
    response = client.get("/api/validation/depth")
    assert response.status_code == 200
    data = response.json()
    metrics = data["depth_metrics"]
    assert len(metrics) == 15
    # Check deep ocean improvements
    depth_300 = next(m for m in metrics if m["depth"] == 300.0)
    assert depth_300["rmse_improvement_pct"] > 0
    depth_1000 = next(m for m in metrics if m["depth"] == 1000.0)
    assert depth_1000["rmse_improvement_pct"] > 25.0
