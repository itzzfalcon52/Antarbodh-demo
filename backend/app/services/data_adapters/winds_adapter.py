from .local_adapter import LocalNetCDFAdapter


class WindsAdapter(LocalNetCDFAdapter):
    def __init__(self):
        super().__init__(
            folder_name="winds",
            source_name="CMEMS_WINDS_L4_REP_OBSERVATIONS",
            filename="winds_bob.nc",
        )


winds_adapter = WindsAdapter()