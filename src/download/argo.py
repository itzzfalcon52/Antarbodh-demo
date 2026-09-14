"""ANTARBODH ARGO Validation Downloader.

Safely fetches independent observational ARGO profile data via ERDDAP
using the exact bounds defined in the configuration.
"""

import urllib.request
import urllib.parse
import json
import yaml
import sys
from pathlib import Path
from datetime import datetime

def load_config(config_path="configs/prototype.yaml"):
    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

def download_argo(config_path="configs/prototype.yaml", overwrite=False):
    cfg = load_config(config_path)
    
    if "argo" not in cfg or not cfg["argo"].get("enabled", False):
        print("ARGO validation is not enabled in config. Skipping.")
        return

    argo_cfg = cfg["argo"]
    out_dir = Path(argo_cfg["output_directory"])
    out_dir.mkdir(parents=True, exist_ok=True)
    
    out_file = out_dir / argo_cfg["filename"]
    meta_file = out_dir / "argo_metadata.json"
    
    if out_file.exists() and not overwrite:
        print(f"File {out_file} already exists. Use overwrite=True to redownload.")
        return
        
    print("============================================================")
    print("PHASE 3: ARGO DOWNLOADING")
    print("============================================================")
    print(f"Source:           {argo_cfg['source']}")
    print(f"Dataset ID:       {argo_cfg['dataset_id']}")
    print(f"Period Requested: {argo_cfg['start_date']} to {argo_cfg['end_date']}")
    print(f"Domain Bounds:    Lat: {argo_cfg['min_lat']} to {argo_cfg['max_lat']}")
    print(f"                  Lon: {argo_cfg['min_lon']} to {argo_cfg['max_lon']}")
    print("============================================================")
    
    base_url = argo_cfg["url"]
    
    # Extract variable names dynamically from config
    variables = argo_cfg["variables"]
    var_list = [
        variables["longitude"],
        variables["latitude"],
        variables["time"],
        variables["pressure"],
        variables["temperature"],
        variables["temperature_qc"],
        variables["temperature_adjusted"],
        variables["temperature_adjusted_qc"],
        variables["data_mode"],
        variables["platform_number"],
        variables["cycle_number"]
    ]
    query_vars = ",".join(var_list)
    
    # ERDDAP Constraints
    constraints = (
        f"&time>={argo_cfg['start_date']}"
        f"&time<={argo_cfg['end_date']}"
        f"&latitude>={argo_cfg['min_lat']}"
        f"&latitude<={argo_cfg['max_lat']}"
        f"&longitude>={argo_cfg['min_lon']}"
        f"&longitude<={argo_cfg['max_lon']}"
    )
    
    query_string = query_vars + constraints
    encoded_query = urllib.parse.quote(query_string, safe="=&,")
    full_url = f"{base_url}?{encoded_query}"
    
    print("\nExecuting server-side filtered query...")
    print(f"ERDDAP Endpoint: {full_url}\n")
    
    try:
        req = urllib.request.Request(full_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            content = response.read().decode('utf-8')
            
        lines = content.strip().split('\n')
        if len(lines) <= 2:
            print("WARNING: Dataset returned no data for the requested bounds!")
            return
            
        header = lines[0]
        data_rows = lines[2:] # Skip unit row
        num_obs = len(data_rows)
        
        # Verify variables
        missing = [v for v in var_list if v not in header]
        if missing:
            print(f"CRITICAL ERROR: Source schema mismatch! Missing expected columns: {missing}")
            print(f"Header received: {header}")
            return
            
        # Identify unique profiles
        # We index the platform and cycle columns
        h_cols = header.split(',')
        plat_idx = h_cols.index(variables["platform_number"])
        cycle_idx = h_cols.index(variables["cycle_number"])
        
        profiles = set()
        for row in data_rows:
            cols = row.split(',')
            profiles.add((cols[plat_idx], cols[cycle_idx]))
            
        # Write to file
        with out_file.open("w", encoding="utf-8") as f:
            f.write(content)
            
        print(f"Download complete!")
        print(f"File Size:            {out_file.stat().st_size / 1024 / 1024:.2f} MB")
        print(f"Total Observations:   {num_obs:,}")
        print(f"Unique Profiles:      {len(profiles):,}")
        print(f"Output File:          {out_file}")
        
        # Save Metadata
        meta = {
            "retrieval_date": datetime.utcnow().isoformat() + "Z",
            "source": argo_cfg["source"],
            "dataset_id": argo_cfg["dataset_id"],
            "url": full_url,
            "observations": num_obs,
            "profiles": len(profiles),
            "file_size_bytes": out_file.stat().st_size
        }
        with meta_file.open("w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)
            
        print(f"Metadata saved to:    {meta_file}")
        
    except urllib.error.HTTPError as e:
        print(f"HTTP Download Failed: {e.code} - {e.reason}")
        print(e.read().decode('utf-8')[:500])
    except Exception as e:
        print(f"Download Failed: {e}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Download ARGO validation data.")
    parser.add_argument("--config", default="configs/prototype.yaml")
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()
    
    download_argo(args.config, args.overwrite)
