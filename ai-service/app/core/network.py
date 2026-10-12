"""Network utilities for cross-platform socket connection reliability."""

import socket
import logging

logger = logging.getLogger("ai_service.network")

_patched = False

def configure_ipv4_preference():
    """Ensure IPv4 addresses take priority over IPv6 to prevent TCP SYN timeouts on Windows networks."""
    global _patched
    if _patched:
        return
    try:
        orig_getaddrinfo = socket.getaddrinfo

        def _ipv4_first_getaddrinfo(host, port, family=0, *args, **kwargs):
            try:
                res = orig_getaddrinfo(host, port, family, *args, **kwargs)
                # Sort AF_INET (IPv4) ahead of AF_INET6 (IPv6)
                return sorted(res, key=lambda x: 0 if x[0] == socket.AF_INET else 1)
            except Exception:
                return orig_getaddrinfo(host, port, family, *args, **kwargs)

        socket.getaddrinfo = _ipv4_first_getaddrinfo
        _patched = True
        logger.debug("IPv4 connection preference configured successfully.")
    except Exception as exc:
        logger.warning("Could not configure IPv4 preference: %s", exc)

# Auto-apply on import
configure_ipv4_preference()
