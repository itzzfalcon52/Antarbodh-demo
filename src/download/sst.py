"""Download daily SST for ANTARBODH.

Run from the repository root:
    python src/download/sst.py
"""

from common import load_config, project_window, run_subset


def main():
    cfg = load_config()
    c = cfg["sst"]

    start, end, min_lon, max_lon, min_lat, max_lat = project_window(cfg)

    run_subset(
        dataset_id=c["dataset_id"],
        variables=c["variables"],
        start_datetime=start,
        end_datetime=end,
        minimum_longitude=min_lon,
        maximum_longitude=max_lon,
        minimum_latitude=min_lat,
        maximum_latitude=max_lat,
        output_directory=c["output_directory"],
        output_filename=c["output_filename"],
    )


if __name__ == "__main__":
    main()
