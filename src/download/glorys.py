"""
ANTARBODH - GLORYS Data Downloader

Downloads a subset of GLORYS12V1 daily potential temperature
data using the Copernicus Marine Toolbox.

Configuration is read from:
    configs/prototype.yaml

Raw data is saved under:
    data/raw/glorys/
"""

from pathlib import Path
import subprocess
import sys

import yaml



# PROJECT PATHS


PROJECT_ROOT = Path(__file__).resolve().parents[2]

CONFIG_FILE = PROJECT_ROOT / "configs" / "prototype.yaml"
OUTPUT_DIR = PROJECT_ROOT / "data" / "raw" / "glorys"


# LOAD CONFIGURATION


def load_config():
    """Load the ANTARBODH project configuration."""

    if not CONFIG_FILE.exists():
        raise FileNotFoundError(
            f"Configuration file not found: {CONFIG_FILE}"
        )

    with open(CONFIG_FILE, "r", encoding="utf-8") as file:
        config = yaml.safe_load(file)

    return config



# DOWNLOAD GLORYS


def download_glorys():
    """Download the configured GLORYS subset."""

    config = load_config()

    region = config["region"]
    time = config["time"]
    glorys = config["glorys"]

    # Create output directory if it doesn't exist
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

   
    # Build Copernicus Marine subset command
   

    command = [
        "copernicusmarine",
        "subset",

        "--dataset-id",
        glorys["dataset_id"],

        "--variable",
        glorys["variable"],

        "--start-datetime",
        time["start"],

        "--end-datetime",
        time["end"],

        "--minimum-longitude",
        str(region["min_lon"]),

        "--maximum-longitude",
        str(region["max_lon"]),

        "--minimum-latitude",
        str(region["min_lat"]),

        "--maximum-latitude",
        str(region["max_lat"]),

        "--minimum-depth",
        str(glorys["min_depth"]),

        "--maximum-depth",
        str(glorys["max_depth"]),

        "--output-directory",
        str(OUTPUT_DIR),

        "--output-filename",
        glorys["output_filename"],

        "--file-format",
        "netcdf",

        "--netcdf-compression-level",
        "4",
    ]

    
    # Display configuration
    

    print("=" * 60)
    print("ANTARBODH - GLORYS Downloader")
    print("=" * 60)

    print(f"Dataset      : {glorys['dataset_id']}")
    print(f"Variable     : {glorys['variable']}")
    print(
        f"Region       : "
        f"{region['min_lat']}–{region['max_lat']}°N, "
        f"{region['min_lon']}–{region['max_lon']}°E"
    )
    print(
        f"Time         : "
        f"{time['start']} → {time['end']}"
    )
    print(
        f"Depth        : "
        f"{glorys['min_depth']}–{glorys['max_depth']} m"
    )
    print(f"Output       : {OUTPUT_DIR}")
    print("=" * 60)

    # Run Copernicus Marine command

    print("\nStarting download...\n")

    try:
        subprocess.run(
            command,
            check=True,
        )

    except FileNotFoundError:
        print(
            "\nERROR: 'copernicusmarine' command was not found."
        )
        print(
            "Make sure the .venv is activated and "
            "copernicusmarine is installed."
        )
        sys.exit(1)

    except subprocess.CalledProcessError as error:
        print(
            f"\nERROR: GLORYS download failed "
            f"with exit code {error.returncode}."
        )
        sys.exit(error.returncode)

    print("\n" + "=" * 60)
    print("GLORYS download completed successfully.")
    print(f"Files are stored in: {OUTPUT_DIR}")
    print("=" * 60)


# ENTRY POINT


if __name__ == "__main__":
    download_glorys()