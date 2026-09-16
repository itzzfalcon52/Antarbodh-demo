from .local_adapter import LocalNetCDFAdapter


class CurrentsAdapter(LocalNetCDFAdapter):
    def __init__(self):
        super().__init__(
            folder_name="currents",
            source_name="CMEMS_CURRENTS_L4_REP_OBSERVATIONS",
            filename="currents_bob_(2).nc",
        )


currents_adapter = CurrentsAdapter()