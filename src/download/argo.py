"""Download Argo data for ANTARBODH independent validation.

Important:
- Argo is NOT a Copernicus Marine subset dataset in this workflow.
- This script downloads the regional Argo profile index from the Argo GDAC
  and then downloads matching profile NetCDF files.
- It is intentionally separate from the ML-input download scripts.

Run from the repository root:
    python src/download/argo.py

The script uses the global Argo GDAC HTTPS index:
https://usgodae.org/pub/outgoing/argo/
"""

from pathlib import Path
import csv
import io
import urllib.request
import yaml


CONFIG_PATH = Path("configs/prototype.yaml")
GDAC_ROOT = "https://usgodae.org/pub/outgoing/argo"


def load_config():
    with CONFIG_PATH.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def download(url, destination):
    destination.parent.mkdir(parents=True, exist_ok=True)
    print(f"Downloading {url}")
    opener = urllib.request.build_opener()
    opener.addheaders = [('User-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')]
    urllib.request.install_opener(opener)
    urllib.request.urlretrieve(url, destination)


def main():
    cfg = load_config()
    region = cfg["region"]
    time = cfg["time"]

    outdir = Path(cfg["argo"]["output_directory"])
    outdir.mkdir(parents=True, exist_ok=True)

    # GDAC profile index is the authoritative way to discover profile files.
    index_url = f"{GDAC_ROOT}/ar_index_global_prof.txt"

    index_path = outdir / "ar_index_global_prof.txt"
    download(index_url, index_path)

    print("\nIndex downloaded.")
    print(
        "The global index can contain millions of rows; filtering is done locally "
        "to avoid repeatedly querying the GDAC."
    )

    min_lon = float(region["min_lon"])
    max_lon = float(region["max_lon"])
    min_lat = float(region["min_lat"])
    max_lat = float(region["max_lat"])
    start = time["start"]
    end = time["end"]

    matched = []

    with index_path.open("r", encoding="utf-8", errors="replace") as f:
        reader = csv.reader(
            (line for line in f if not line.startswith("#")),
            delimiter=",",
        )

        for row in reader:
            if len(row) < 4:
                continue

            # Argo profile index columns are version-dependent. The first
            # four fields conventionally include file/date/latitude/longitude.
            file_path = row[0].strip()
            date = row[1].strip()
            try:
                lat = float(row[2])
                lon = float(row[3])
            except ValueError:
                continue

            if start <= date[:10] <= end and min_lat <= lat <= max_lat and min_lon <= lon <= max_lon:
                matched.append(file_path)

    print(f"Matching regional profiles found: {len(matched)}")

    profiles_dir = outdir / "profiles"
    profiles_dir.mkdir(exist_ok=True)

    for relative_path in matched:
        url = f"{GDAC_ROOT}/{relative_path.lstrip('/')}"
        destination = profiles_dir / Path(relative_path).name
        if not destination.exists():
            download(url, destination)

    print(f"Profiles stored in: {profiles_dir}")


if __name__ == "__main__":
    main()
