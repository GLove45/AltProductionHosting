from __future__ import annotations

from dataclasses import dataclass
from ipaddress import IPv4Network
from typing import Dict


@dataclass
class PeerConfig:
    public_key: str
    endpoint: str
    allowed_ips: str


class WireGuardConfigurator:
    def __init__(self, cidr: str) -> None:
        self.network = IPv4Network(cidr)
        self.peers: Dict[str, PeerConfig] = {}

    def add_peer(self, name: str, *, public_key: str, endpoint: str) -> PeerConfig:
        allowed = f"{self.network.network_address}/{self.network.prefixlen}"
        config = PeerConfig(public_key=public_key, endpoint=endpoint, allowed_ips=allowed)
        self.peers[name] = config
        return config

    def render(self) -> str:
        lines = ["[Interface]", f"Address = {self.network.network_address}/{self.network.prefixlen}"]
        for name, peer in self.peers.items():
            lines.extend(
                [
                    "", "[Peer]", f"# {name}", f"PublicKey = {peer.public_key}", f"Endpoint = {peer.endpoint}", f"AllowedIPs = {peer.allowed_ips}",
                ]
            )
        return "\n".join(lines)
