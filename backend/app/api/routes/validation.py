from fastapi import APIRouter, HTTPException
import json
import os

router = APIRouter()

@router.get("/report")
def get_validation_report():
    report_path = os.path.join("outputs", "evaluation", "argo_glorys_comparison_report.json")
    if not os.path.exists(report_path):
        raise HTTPException(status_code=404, detail="Validation report not found")
    
    with open(report_path, "r") as f:
        data = json.load(f)
    
    return data
