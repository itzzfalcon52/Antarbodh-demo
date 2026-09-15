from fastapi import APIRouter
from ...services.data_availability_service import data_availability_service

router = APIRouter()

@router.get("/availability")
def get_availability(date: str):
    return data_availability_service.check_availability(date)
