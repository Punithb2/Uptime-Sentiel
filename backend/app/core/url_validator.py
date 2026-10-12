import ipaddress
import socket
from urllib.parse import urlparse

# Cloud metadata and internal hostnames that must never be targeted
BLOCKED_HOSTNAMES = {
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
    "[::1]",
    "metadata.google.internal",
    "metadata",
    "instance-data",
}

NAT64_PREFIX = ipaddress.IPv6Network("64:ff9b::/96")

def is_ip_restricted(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """Checks if an IP is private, loopback, metadata, or reserved, with NAT64 awareness."""
    if isinstance(ip, ipaddress.IPv6Address) and ip in NAT64_PREFIX:
        ipv4_int = int(ip) & 0xFFFFFFFF
        return is_ip_restricted(ipaddress.IPv4Address(ipv4_int))
    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or str(ip) == "169.254.169.254"
        or ip.is_reserved
    )

def validate_safe_url(url_str: str, allow_http: bool = True) -> str:
    """
    Strict SSRF validation:
    - Verifies valid scheme (http or https).
    - Blocks private IP ranges (RFC 1918, loopbacks, link-local, multicast, reserved).
    - Blocks cloud metadata IP (169.254.169.254).
    - Resolves domain names to verify they do not point to internal/metadata addresses (DNS rebinding protection).
    """
    if not url_str or not isinstance(url_str, str):
        raise ValueError("URL must be a non-empty string.")

    cleaned = url_str.strip()
    parsed = urlparse(cleaned)

    allowed_schemes = ("http", "https") if allow_http else ("https",)
    if parsed.scheme not in allowed_schemes:
        raise ValueError(f"URL scheme must be {' or '.join(allowed_schemes).upper()}.")

    hostname = parsed.hostname
    if not hostname:
        raise ValueError("URL hostname is invalid or missing.")

    hostname_lower = hostname.lower()
    if hostname_lower in BLOCKED_HOSTNAMES or hostname_lower.endswith(".internal") or hostname_lower.endswith(".local"):
        raise ValueError(f"Internal host '{hostname}' cannot be targeted.")

    # 1. Check if hostname is directly an IP address
    try:
        ip = ipaddress.ip_address(hostname)
        if is_ip_restricted(ip):
            raise ValueError(f"Targeting internal/private IP address ({ip}) is not permitted.")
        return cleaned
    except ValueError as e:
        if "not permitted" in str(e):
            raise

    # 2. Hostname is a domain name: Resolve via DNS to block DNS rebinding to internal IPs
    try:
        addr_info = socket.getaddrinfo(hostname, None)
        for _, _, _, _, sockaddr in addr_info:
            resolved_ip_str = sockaddr[0]
            resolved_ip = ipaddress.ip_address(resolved_ip_str)
            if is_ip_restricted(resolved_ip):
                raise ValueError(f"Target domain resolves to restricted internal address ({resolved_ip_str}).")
    except (socket.gaierror, socket.herror):
        # If domain cannot be resolved at definition time, allow it to permit newly registered/offline domains
        pass

    return cleaned
