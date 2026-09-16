from .local_adapter import LocalNetCDFAdapter


class SSTAdapter(LocalNetCDFAdapter):
    def __init__(self):
        super().__init__(
            folder_name="sst",
            source_name="CMEMS_SST_L4_REP_OBSERVATIONS",
            filename="sst_bob.nc",
        )


sst_adapter = SSTAdapter()