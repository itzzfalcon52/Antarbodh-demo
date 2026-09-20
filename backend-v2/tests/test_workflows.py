import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from backend.app.main import app
import numpy as np
import xarray as xr

client = TestClient(app)

@patch("backend.app.api.routes.temperature.historical_service")
def test_workflow_a_historical(mock_hist):
    """WORKFLOW A — HISTORICAL (e.g., 2025-06-15)"""
    mock_hist.has_date.return_value = True
    mock_hist.get_temperature_field.return_value = {
        "mode": "historical",
        "date": "2025-06-15",
        "depth_m": 100,
        "cached": True,
        "provenance": "cached_antarbodh_prediction"
    }

    response = client.get("/api/temperature?date=2025-06-15&depth=100")
    
    assert response.status_code == 200
    data = response.json()
    assert data["mode"] == "historical"
    assert data["cached"] is True
    # The CNN should NOT have been called. We verified this by patching only historical_service.

@patch("backend.app.services.prediction_service.surface_data_service")
@patch("backend.app.services.prediction_service.cache_service")
@patch("backend.app.services.prediction_service.model_service")
@patch("backend.app.services.prediction_service.preprocessing_service")
@patch("backend.app.services.prediction_service.normalization_service")
@patch("backend.app.services.prediction_service.data_availability_service")
def test_workflow_b_new_date(
    mock_avail, mock_norm, mock_prep, mock_model, mock_cache, mock_surf
):
    """WORKFLOW B — NEW DATE (e.g., 2026-03-15)"""
    date_str = "2026-03-15"
    
    # 1. Availability says yes (even with partial missing data like SSS)
    mock_avail.check_availability.return_value = {
        "prediction_possible": True,
        "input_completeness": "partial",
        "missing_inputs": ["sss"]
    }
    
    # 2. Cache says no initially
    mock_cache.has_cached_prediction.return_value = False
    
    # Mock preprocessing returning valid shapes
    mock_prep.preprocess.return_value = (np.zeros((7, 60, 80)), np.ones((7, 60, 80)))
    mock_prep.common_lat = np.linspace(5, 20, 60)
    mock_prep.common_lon = np.linspace(80, 100, 80)
    
    # Mock normalization
    mock_norm.normalize.return_value = np.zeros((7, 60, 80))
    
    # Mock model
    mock_model.predict.return_value = np.zeros((15, 60, 80))
    
    # Mock cache load return
    ds_mock = MagicMock()
    ds_mock.depth.values = np.array([0, 5, 10, 100])
    ds_mock_sel = MagicMock()
    ds_mock_sel.temperature.values = np.zeros((60, 80))
    ds_mock_sel.latitude.values = np.zeros(60)
    ds_mock_sel.longitude.values = np.zeros(80)
    ds_mock.sel.return_value = ds_mock_sel
    ds_mock.attrs.get.return_value = "on_demand_prediction"
    
    mock_cache.load_cached_prediction.return_value = ds_mock
    
    response = client.get(f"/api/temperature?date={date_str}&depth=100")
    
    assert response.status_code == 200
    data = response.json()
    assert data["mode"] == "on_demand_prediction"
    assert data["cached"] is False # It was generated on this request
    
    # Verify CNN was called exactly once
    mock_model.predict.assert_called_once()
    mock_cache.save_prediction.assert_called_once()


@patch("backend.app.services.prediction_service.data_availability_service")
def test_workflow_c_unavailable(mock_avail):
    """WORKFLOW C — UNAVAILABLE DATE (e.g., 2027-01-01)"""
    date_str = "2027-01-01"
    
    # Availability says no (no surface data)
    mock_avail.check_availability.return_value = {
        "prediction_possible": False,
        "input_completeness": "insufficient",
        "missing_inputs": ["sst", "sss", "ssh", "current_u", "current_v", "wind_u", "wind_v"],
        "reason": "Mandatory channels missing"
    }
    
    response = client.get(f"/api/temperature?date={date_str}&depth=100")
    
    assert response.status_code == 422
    data = response.json()
    assert "detail" in data
    assert data["detail"]["availability"]["prediction_possible"] is False
    assert data["detail"]["availability"]["missing_inputs"] == ["sst", "sss", "ssh", "current_u", "current_v", "wind_u", "wind_v"]
