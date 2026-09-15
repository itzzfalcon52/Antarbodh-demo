from .local_adapter import LocalNetCDFAdapter

class WindsAdapter(LocalNetCDFAdapter):
    def __init__(self):
        super().__init__("winds", "CMEMS_WINDS_L4_REP_OBSERVATIONS")

winds_adapter = WindsAdapter()
