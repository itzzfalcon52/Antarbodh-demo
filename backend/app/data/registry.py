from enum import Enum

class DatasetRole(str, Enum):
    OPERATIONAL_INPUT = "operational_input"
    TRAINING_REFERENCE = "training_reference"
    INDEPENDENT_VALIDATION = "independent_validation"
    CLIMATOLOGY_BASELINE = "climatology_baseline"

class DatasetInfo:
    def __init__(self, name: str, role: DatasetRole, description: str):
        self.name = name
        self.role = role
        self.description = description

REGISTRY = {
    "SST": DatasetInfo("SST", DatasetRole.OPERATIONAL_INPUT, "Surface model input (Satellite Sea Surface Temperature)"),
    "SSS": DatasetInfo("SSS", DatasetRole.OPERATIONAL_INPUT, "Surface model input (Sea Surface Salinity)"),
    "SSH": DatasetInfo("SSH", DatasetRole.OPERATIONAL_INPUT, "Surface model input (Sea Surface Height)"),
    "CURRENTS": DatasetInfo("CURRENTS", DatasetRole.OPERATIONAL_INPUT, "Surface model input (Geostrophic/Total Currents U,V)"),
    "WINDS": DatasetInfo("WINDS", DatasetRole.OPERATIONAL_INPUT, "Surface model input (Surface Winds U,V)"),
    "GLORYS": DatasetInfo("GLORYS", DatasetRole.TRAINING_REFERENCE, "NOT AN OPERATIONAL INPUT. Used for supervised training target."),
    "ARGO": DatasetInfo("ARGO", DatasetRole.INDEPENDENT_VALIDATION, "Independent validation only. No inference leakage."),
    "WOA": DatasetInfo("WOA", DatasetRole.CLIMATOLOGY_BASELINE, "Climatological reference/baseline.")
}
