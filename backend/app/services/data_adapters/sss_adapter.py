from .local_adapter import LocalNetCDFAdapter


class SSSAdapter(LocalNetCDFAdapter):
    def __init__(self):
        super().__init__(
            folder_name="sss",
            source_name="CMEMS_SSS_L4_REP_OBSERVATIONS",
            filename="sss_bob_full.nc",
        )


sss_adapter = SSSAdapter()