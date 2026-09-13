"""Shared utilities for ANTARBODH download scripts."""

from pathlib import Path
import subprocess
import sys
import yaml


PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
CONFIG_PATH = PROJECT_ROOT / "configs" / "prototype.yaml"


def load_config():
    if not CONFIG_PATH.exists():
        raise FileNotFoundError(
            f"Configuration not found: {CONFIG_PATH}."
        )
    with CONFIG_PATH.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def run_subset(
    dataset_id,
    variables,
    start_datetime,
    end_datetime,
    minimum_longitude,
    maximum_longitude,
    minimum_latitude,
    maximum_latitude,
    output_directory,
    output_filename,
    minimum_depth=None,
    maximum_depth=None,
    overwrite=True,
):
    """Run copernicusmarine subset using the CLI."""
    outdir = Path(output_directory)
    if not outdir.is_absolute():
        outdir = PROJECT_ROOT / outdir
    outdir.mkdir(parents=True, exist_ok=True)

    cmd = [
    "copernicusmarine",
    "subset",
    "--dataset-id", dataset_id,
    ]

    cmd += sum([["--variable", variable] for variable in variables], [])

    cmd += [
    "--start-datetime", start_datetime,
    "--end-datetime", end_datetime,
    "--minimum-longitude", str(minimum_longitude),
    "--maximum-longitude", str(maximum_longitude),
    "--minimum-latitude", str(minimum_latitude),
    "--maximum-latitude", str(maximum_latitude),
    "--output-directory", str(outdir),
    "--output-filename", output_filename,
    "--file-format", "netcdf",
    "--netcdf-compression-level", "4",
]

    if minimum_depth is not None:
        cmd += ["--minimum-depth", str(minimum_depth)]
    if maximum_depth is not None:
        cmd += ["--maximum-depth", str(maximum_depth)]
    if overwrite:
        cmd += ["--overwrite"]

    print("Running:")
    print(" ".join(cmd))
    subprocess.run(cmd, check=True)


def project_window(cfg):
    region = cfg["region"]
    time = cfg["time"]
    return (
        time["start"],
        time["end"],
        region["min_lon"],
        region["max_lon"],
        region["min_lat"],
        region["max_lat"],
    )
