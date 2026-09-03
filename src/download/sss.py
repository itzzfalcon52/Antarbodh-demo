"""Download daily SSS for ANTARBODH.

The configured Copernicus Marine product exposes separate ascending and
descending SMOS daily datasets. This script downloads both.

Run from the repository root:
    python src/download/sss.py
"""

from common import load_config, project_window, run_subset


def main():
    cfg = load_config()
    c = cfg["sss"]

    start, end, min_lon, max_lon, min_lat, max_lat = project_window(cfg)

    common = dict(
        variables=c["variables"],
        start_datetime=start,
        end_datetime=end,
        minimum_longitude=min_lon,
        maximum_longitude=max_lon,
        minimum_latitude=min_lat,
        maximum_latitude=max_lat,
        output_directory=c["output_directory"],
    )

    run_subset(
        dataset_id=c["dataset_id_ascending"],
        output_filename=c["output_filename"] + "_ascending",
        **common,
    )

    run_subset(
        dataset_id=c["dataset_id_descending"],
        output_filename=c["output_filename"] + "_descending",
        **common,
    )


if __name__ == "__main__":
    main()
