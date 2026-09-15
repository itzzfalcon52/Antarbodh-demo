from .local_adapter import LocalNetCDFAdapter

class SSSAdapter(LocalNetCDFAdapter):
    def __init__(self):
        super().__init__("sss", "CMEMS_SSS_L4_REP_OBSERVATIONS")

sss_adapter = SSSAdapter()
