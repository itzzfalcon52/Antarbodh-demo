import sys
import os
sys.path.append(os.getcwd())

from app.services.prediction_service import prediction_service

print("Starting test...")
try:
    dataset = prediction_service.get_prediction("2025-01-15")
    print("Done! Dataset:", dataset)
except Exception as e:
    import traceback
    traceback.print_exc()
