import glob

def fix(file):
    with open(file, 'r') as f:
        content = f.read()

    # Fix type imports
    content = content.replace("import { ProfileResponse }", "import type { ProfileResponse }")
    content = content.replace("import { TemperatureFieldResponse }", "import type { TemperatureFieldResponse }")
    content = content.replace("import { TemperatureFieldResponse, ProfileResponse }", "import type { TemperatureFieldResponse, ProfileResponse }")
    content = content.replace("import { FeatureCollection, Polygon }", "import type { FeatureCollection, Polygon }")
    
    # Fix maplibre import
    content = content.replace("import maplibregl from 'maplibre-gl';", "import * as maplibregl from 'maplibre-gl';")

    # Fix implicitly any e
    content = content.replace("(e) => {", "(e: any) => {")
    content = content.replace("onDateChange(prev => {", "onDateChange((prev: string) => {")

    with open(file, 'w') as f:
        f.write(content)

for f in glob.glob('frontend/src/**/*.ts*', recursive=True):
    fix(f)

print("Fixed")
