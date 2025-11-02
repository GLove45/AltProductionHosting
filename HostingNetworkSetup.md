# Hosting Network Setup Guide

This document provides a comprehensive, verbose walkthrough for configuring a hybrid studio/home hosting environment that leverages a NordVPN Dedicated IP service fronted by Cloudflare and interlinks the two sites through WireGuard.

---

## 1. Reference Topology Overview

```
                Internet
                   │
           [ Cloudflare DNS/WAF ]
                   │   (A/CNAME → 151.244.206.51)
                   ▼
         ┌─────────────────────────┐
         │  NordVPN Dedicated IP   │  (exit = 151.244.206.51)
         └─────────────────────────┘
                   │  (tunnel)
            [Studio VPN Router]
                   │
        ┌──────────┴──────────┐
        │ Managed Switch/VLANs│
        └──────────┬──────────┘
                   │
   ┌───────────────────────────────────────────────┐
   │                Studio LAN (10.10.10.0/24)     │
   │  Pi-frontend   10.10.10.10 : 80/443           │
   │  Pi-backend    10.10.10.11 : 3000, 22         │
   │  Pi-db         10.10.10.12 : 5432             │
   │  Pi-sentinel   10.10.10.13 : 51820 (WG server)│
   │  Pi-energy     10.10.10.14 : 9100, 19999      │
   └───────────────────────────────────────────────┘
                   ▲
         DNAT/forwards from 151.244.206.51

                 (site-to-site WireGuard)
                   ▼
   ┌───────────────────────────────────────────────┐
   │                Home LAN (10.10.20.0/24)       │
   │  Home VPN Router (WG peer)                    │
   │  Home Pis…                                    │
   └───────────────────────────────────────────────┘
```

---

## 2. Cloudflare Configuration (DNS + WAF)

1. **Create DNS Records**
   - Navigate to the Cloudflare dashboard for the target zone.
   - Add an **A record** (or **CNAME** if appropriate) pointing to the NordVPN dedicated egress IP `151.244.206.51`.
   - Enable the **Proxy (orange cloud)** to route inbound traffic through Cloudflare’s WAF and CDN edge.
2. **WAF/Security Posture**
   - Activate **Managed Rules**, customizing to allow expected traffic types (HTTP/S for `Pi-frontend`, API ports for `Pi-backend`, etc.).
   - Configure **Rate Limiting** for high-risk endpoints (e.g., `/api/login`, `/graphql`).
   - Define **Access Rules** restricting administrative paths to known IP ranges.
3. **Zero Trust (Optional)**
   - If using Cloudflare Zero Trust, create access policies for sensitive services (e.g., `Pi-backend` admin panels), mapping them to identity providers.

> **Validation:** Use Cloudflare analytics to confirm traffic is proxied and the NordVPN dedicated IP remains the origin target.

---

## 3. NordVPN Dedicated IP Tunnel Preparation

1. **Provision Dedicated IP**
   - Ensure the NordVPN account has the dedicated IP entitlement and note the exit IP `151.244.206.51`.
   - Obtain the **OpenVPN/WireGuard configuration** from NordVPN specifically for the dedicated IP endpoint.
2. **Credentials & Certificates**
   - Securely store NordVPN service credentials (`.ovpn` config, certificates, or WireGuard keys) on the **Studio VPN Router**.
   - Apply appropriate file permissions (`chmod 600`) and store secrets in a password manager.
3. **Connectivity Test**
   - From the Studio VPN Router, initiate the NordVPN tunnel and verify the public egress is `151.244.206.51` (e.g., via `curl https://ifconfig.me`).
   - Confirm tunnel persistence across reboots using systemd services or router-specific auto-start mechanisms.

---

## 4. Studio VPN Router Configuration

1. **NordVPN Tunnel Interface**
   - Import the NordVPN configuration into the router (OpenWrt, pfSense, VyOS, etc.).
   - Configure the tunnel interface (e.g., `tun0` or `wg0`) with:
     - Keepalive values recommended by NordVPN.
     - MTU adjustments if Cloudflare or the ISP imposes encapsulation overhead.
2. **Routing & NAT**
   - Set the default route for outbound traffic requiring the dedicated IP to traverse the NordVPN tunnel.
   - Configure **Policy-Based Routing** if only selected subnets/services (e.g., studio servers) should exit via NordVPN.
   - Implement **Source NAT (SNAT)**/MASQUERADE so packets from the studio LAN appear as the NordVPN exit IP.
3. **Firewall Rules**
   - Allow inbound connections from Cloudflare IP ranges to services on the studio LAN via DNAT.
   - Restrict management access on the router to trusted administrative hosts.
4. **High Availability (Optional)**
   - Deploy a secondary router or VRRP/HSRP pair to maintain uptime if the primary router fails.

---

## 5. Studio LAN Services Mapping

| Hostname     | IP            | Ports Exposed | Purpose/Notes |
|--------------|---------------|---------------|---------------|
| Pi-frontend  | 10.10.10.10   | 80, 443       | Reverse proxy, static assets, TLS termination |
| Pi-backend   | 10.10.10.11   | 3000, 22      | Application API, SSH admin access |
| Pi-db        | 10.10.10.12   | 5432          | PostgreSQL database (internal use only) |
| Pi-sentinel  | 10.10.10.13   | 51820         | WireGuard server bridging to home network |
| Pi-energy    | 10.10.10.14   | 9100, 19999   | Monitoring endpoints (Prometheus, custom metrics) |

**Action Items:**
- Implement DNS (internal/local) to resolve hostnames to IPs within the 10.10.10.0/24 range.
- Harden SSH access using key authentication and `fail2ban` or equivalent.
- Ensure backups and monitoring agents are deployed on all nodes.

---

## 6. DNAT and Port Forwarding from NordVPN Exit IP

1. **Inbound NAT Rules**
   - On the Studio VPN Router, configure port forwards from the NordVPN tunnel interface to internal hosts:
     - `:80`/`:443` → `Pi-frontend` (10.10.10.10)
     - `:3000` → `Pi-backend` (10.10.10.11)
     - `:5432` (if required externally) → `Pi-db` (10.10.10.12)
     - `:51820` → `Pi-sentinel` (10.10.10.13) for site-to-site WireGuard
     - `:9100`, `:19999` → `Pi-energy` (10.10.10.14) for metrics
2. **Security Considerations**
   - Limit exposure by only forwarding ports necessary for external access.
   - Use Cloudflare Spectrum/Argo Tunnel for non-HTTP services if desired to add an extra protection layer.
   - Maintain logs (router + host) for forensic analysis.

---

## 7. Site-to-Site WireGuard (Studio ↔ Home)

1. **Pi-sentinel (Studio WireGuard Server)**
   - Configure `wg0` with a tunnel subnet (e.g., `10.10.30.0/24`).
   - Allow the `Home VPN Router` peer, setting `AllowedIPs = 10.10.20.0/24, 10.10.30.2/32`.
   - Enable `PersistentKeepalive = 25` to sustain connectivity.
2. **Home VPN Router (WireGuard Peer)**
   - Configure matching `wg0` peer pointing to the **NordVPN dedicated IP** (151.244.206.51) and forwarded port `51820`.
   - Set `AllowedIPs = 10.10.10.0/24, 10.10.30.1/32` to reach studio resources.
3. **Routing Integration**
   - On both sides, add static routes so that local LANs (10.10.10.0/24 and 10.10.20.0/24) know to traverse the WireGuard interface.
   - Update firewall rules to allow inter-site traffic for required services (e.g., database replication, monitoring).
4. **Resilience**
   - Monitor link state using scripts that test latency and packet loss.
   - Configure automatic restart or alerting upon link failure.

---

## 8. Home LAN Considerations

1. **VPN Router Placement**
   - Position the Home VPN Router at the network edge or behind the ISP modem in bridge mode.
   - Ensure it supports hardware acceleration for WireGuard to maintain throughput.
2. **Local Services**
   - Enumerate critical home devices (media servers, development machines, IoT) that require studio access and define firewall policies accordingly.
   - Optionally, configure split DNS to resolve studio services to their internal IPs when accessed from home.
3. **Security Hygiene**
   - Maintain firmware updates on routers and IoT devices.
   - Implement VLANs to segment untrusted devices.

---

## 9. Monitoring, Logging, and Maintenance

1. **Observability Stack**
   - Centralize logs from Cloudflare, NordVPN router, and Raspberry Pis (e.g., via Loki/Promtail).
   - Collect metrics using Prometheus, Netdata (`Pi-energy`), and export them to dashboards (Grafana).
2. **Alerting**
   - Configure alerts for VPN tunnel downtime, high latency, or unusual traffic spikes.
   - Implement TLS certificate expiry checks for services exposed via Pi-frontend.
3. **Backups & Disaster Recovery**
   - Snapshot configurations of routers, switches, and servers regularly.
   - Document recovery procedures for NordVPN credentials and Cloudflare API tokens.

---

## 10. Operational Checklist

- [ ] Cloudflare DNS points to `151.244.206.51` and proxy status is orange-cloud.
- [ ] NordVPN tunnel is established with uptime monitoring in place.
- [ ] DNAT rules forward required ports to the correct studio hosts.
- [ ] WireGuard site-to-site link allows full connectivity between 10.10.10.0/24 and 10.10.20.0/24.
- [ ] Security controls (firewall, WAF, access policies) documented and validated.
- [ ] Monitoring, logging, and alerting pipelines operational.
- [ ] Backup strategy tested.

---

## 11. Troubleshooting Tips

- **Cloudflare health checks failing:** Verify the NordVPN tunnel is up and the Studio VPN Router forwards ports correctly. Check for ISP-level blocks on inbound ports.
- **High latency through VPN:** Adjust MTU, ensure no double NAT exists, and confirm router hardware can sustain encryption throughput.
- **WireGuard handshake drops:** Confirm keepalive settings, check that UDP 51820 remains forwarded, and validate time synchronization via NTP.
- **Service unreachable internally:** Ensure VLAN routing on the managed switch is correct and local firewalls allow the traffic.

---

## 12. Change Management Notes

- Document modifications to Cloudflare, NordVPN, router, or WireGuard configs in a shared repository (e.g., Git).
- Enforce peer review for firewall/NAT changes to prevent service outages.
- Schedule maintenance windows for disruptive updates.

---

By following this guide, administrators can maintain a robust, observable hosting environment that blends Cloudflare’s security edge, NordVPN’s dedicated IP egress, and resilient inter-site connectivity between studio and home networks.
