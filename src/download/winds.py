"""Download daily MetOp-B ASCAT surface winds for ANTARBODH.

Selected dataset:
cmems_obs-wind_glo_phy_nrt_l3-metopb-ascat-asc-0.25deg_P1D-i

Variables confirmed from the Copernicus catalogue:
eastward_wind, northward_wind

Run from the repository root:
    python src/download/winds.py
"""

from common import load_config, project_window, run_subset


def main():
    cfg = load_config()
    c = cfg["winds"]

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
