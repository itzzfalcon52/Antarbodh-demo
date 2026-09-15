from .local_adapter import LocalNetCDFAdapter

class SSHAdapter(LocalNetCDFAdapter):
    def __init__(self):
        super().__init__("ssh", "CMEMS_SSH_L4_REP_OBSERVATIONS")

ssh_adapter = SSHAdapter()
