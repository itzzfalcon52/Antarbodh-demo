
''

"""Download Level-4 gap-free surface winds for ANTARBODH.

Product: WIND_GLO_PHY_L4_MY_012_006
Dataset: cmems_obs-wind_glo_phy_my_l4_0.125deg_PT1H
Variables: eastward_wind, northward_wind

Run from the repository root:
    python src/download/winds.py
"""

import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from common import load_config, project_window, run_subset


def main():
    cfg = load_config()
    c = cfg["winds"]

    start, end, min_lon, max_lon, min_lat, max_lat = project_window(cfg)

    print(f"Downloading Level-4 Winds ({c['dataset_id']}) from {start} to {end}...")
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
