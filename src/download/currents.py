"""Download daily surface currents for ANTARBODH.

The selected dataset contains eastward (uo) and northward (vo) velocity.
This script requests the surface layer.

Run from the repository root:
    python src/download/currents.py
"""

from common import load_config, project_window, run_subset


def main():
    cfg = load_config()
    c = cfg["currents"]

    start, end, min_lon, max_lon, min_lat, max_lat = project_window(cfg)

    # Request only the surface. The exact native surface coordinate is
    # resolved by Copernicus Marine's subset service.
    run_subset(
        dataset_id=c["dataset_id"],
        variables=c["variables"],
        start_datetime=start,
        end_datetime=end,
        minimum_longitude=min_lon,
        maximum_longitude=max_lon,
        minimum_latitude=min_lat,
        maximum_latitude=max_lat,
        minimum_depth=0,
        maximum_depth=0,
        output_directory=c["output_directory"],
        output_filename=c["output_filename"],
    )


if __name__ == "__main__":
    main()
