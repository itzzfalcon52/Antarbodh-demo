from .local_adapter import LocalNetCDFAdapter

class CurrentsAdapter(LocalNetCDFAdapter):
    def __init__(self):
        super().__init__("currents", "CMEMS_CURRENTS_L4_REP_OBSERVATIONS")

currents_adapter = CurrentsAdapter()
