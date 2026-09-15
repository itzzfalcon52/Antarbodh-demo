import glob
import json

features = []
files = glob.glob('scratch/npm_geo/node_modules/world-geojson/countries/*.json')

for f in files:
    with open(f, 'r') as fp:
        data = json.load(fp)
        # Some packages have feature collections per country, some just single feature.
        if data.get('type') == 'FeatureCollection':
            features.extend(data.get('features', []))
        elif data.get('type') == 'Feature':
            features.append(data)

fc = {
    "type": "FeatureCollection",
    "features": features
}

with open('frontend/public/assets/countries.geojson', 'w') as fp:
    json.dump(fc, fp)

print(f"Combined {len(features)} countries")
