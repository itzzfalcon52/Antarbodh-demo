from .local_adapter import LocalNetCDFAdapter


class SSHAdapter(LocalNetCDFAdapter):
    def __init__(self):
        super().__init__(
            folder_name="ssh",
            source_name="CMEMS_SSH_L4_REP_OBSERVATIONS",
            filename="ssh_bob_(2).nc",
        )


ssh_adapter = SSHAdapter()