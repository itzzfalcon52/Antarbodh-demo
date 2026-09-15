from .local_adapter import LocalNetCDFAdapter

class SSTAdapter(LocalNetCDFAdapter):
    def __init__(self):
        super().__init__("sst", "CMEMS_SST_L4_REP_OBSERVATIONS")

sst_adapter = SSTAdapter()
