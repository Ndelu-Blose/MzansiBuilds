import os
import socket
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv

import pytest

load_dotenv(Path(__file__).resolve().parent.parent / '.env')


@pytest.fixture(scope="module")
def client():
    if not os.environ.get("DATABASE_URL"):
        pytest.skip("DATABASE_URL is required for API integration tests")
    dburl = os.environ.get('DATABASE_URL', '')
    pu = urlparse(dburl)
    host = pu.hostname
    port = pu.port or 5432
    dns_ok = None
    dns_err = None
    try:
        if host:
            socket.getaddrinfo(host, port, proto=socket.IPPROTO_TCP)
            dns_ok = True
        else:
            dns_ok = False
            dns_err = 'hostname is null (malformed URL?)'
    except OSError as e:
        dns_ok = False
        dns_err = f'{type(e).__name__}: {e!s}'[:300]
    if not dns_ok:
        pytest.skip(
            f'Cannot resolve DATABASE_URL host {host!r} ({dns_err}). '
            'Confirm the project ref in Supabase → Settings → Database matches db.<ref>.supabase.co, '
            'or fix network/DNS/VPN.',
        )
    from starlette.testclient import TestClient
    from server import app

    with TestClient(app) as c:
        yield c
