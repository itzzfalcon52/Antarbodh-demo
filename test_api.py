import urllib.request
import json
import time

start = time.time()
req = urllib.request.urlopen("http://localhost:8000/api/temperature?date=2025-01-01&depth=0&mode=historical")
resp = req.read()
end = time.time()

data = json.loads(resp)
print(f"Status: {req.status}")
print(f"Time: {end-start:.3f}s")
print(f"Keys: {list(data.keys())}")
print(f"Latitude shape: {len(data.get('latitude', []))}")
print(f"Longitude shape: {len(data.get('longitude', []))}")
print(f"Temperature shape: {len(data.get('temperature', []))} x {len(data.get('temperature', [[]])[0]) if data.get('temperature') else 0}")
