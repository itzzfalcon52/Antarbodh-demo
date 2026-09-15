import urllib.request
import time
import json

urls = [
    "http://localhost:8000/api/health",
    "http://localhost:8000/api/temperature?date=2025-01-01&depth=0&mode=historical",
    "http://localhost:8000/api/temperature?date=2025-01-01&depth=100&mode=historical",
    "http://localhost:8000/api/temperature?date=2025-06-01&depth=0&mode=historical",
    "http://localhost:8000/api/profile?date=2025-01-01&lat=12.5&lon=88&mode=historical"
]

for url in urls:
    start = time.time()
    try:
        req = urllib.request.urlopen(url)
        status = req.status
        _ = req.read()
    except Exception as e:
        status = str(e)
    end = time.time()
    
    path = url.split("8000")[1]
    print(f"{path} -> Status: {status} | Time: {end-start:.3f}s")
