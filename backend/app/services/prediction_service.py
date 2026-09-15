import numpy as np
import torch
from fastapi import HTTPException
from .data_availability_service import data_availability_service
from .surface_data_service import surface_data_service
from .preprocessing_service import preprocessing_service
from .normalization_service import normalization_service
from .model_service import model_service
from .cache_service import cache_service
from ..config import settings
from src.preprocessing.config import PHYSICAL_CHANNELS

class PredictionService:
    def get_prediction(self, date_str: str):
        # 1. Check if already cached
        if cache_service.has_cached_prediction(date_str):
            return cache_service.load_cached_prediction(date_str)
            
        # 2. Check availability
        availability = data_availability_service.check_availability(date_str)
        if not availability["prediction_possible"]:
            raise HTTPException(
                status_code=422,
                detail={
                    "error": "Prediction Unavailable",
                    "availability": availability
                }
            )
            
        # 3. Load surface fields
        raw_datasets = surface_data_service.fetch_all(date_str)
        
        # 4. Preprocess
        physical_array, missing_masks = preprocessing_service.preprocess(date_str, raw_datasets)
        
        # 5. Normalize
        normalized_physical = normalization_service.normalize(physical_array, PHYSICAL_CHANNELS)
        
        # 6. Fill missing values with 0
        normalized_physical = np.nan_to_num(normalized_physical, nan=0.0)
        
        # 7. Construct 14-channel tensor
        input_14_channels = np.concatenate([normalized_physical, missing_masks], axis=0) # (14, H, W)
        input_tensor = torch.tensor(input_14_channels, dtype=torch.float32).unsqueeze(0) # (1, 14, H, W)
        
        # 8. Run frozen CNN
        temperature_prediction = model_service.predict(input_tensor) # (15, H, W)
        
        # 9. Cache prediction
        cache_service.save_prediction(
            date_str, 
            temperature_prediction, 
            preprocessing_service.common_lat, 
            preprocessing_service.common_lon, 
            settings.target_depths
        )
        
        # 10. Return dataset
        return cache_service.load_cached_prediction(date_str)

prediction_service = PredictionService()
