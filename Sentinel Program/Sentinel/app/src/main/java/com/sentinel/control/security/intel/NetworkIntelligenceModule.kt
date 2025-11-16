package com.sentinel.control.security.intel

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.TrafficStats
import android.net.wifi.WifiManager
import java.io.File
import java.net.Inet6Address

class NetworkIntelligenceModule(private val context: Context) {
    private val localDetector = LocalNetworkThreatDetector(context)
    private val vpnMonitor = VpnIntegrityMonitor(context)
    private val packetModeler = PacketBehaviorModeler(context)

    fun evaluate(): NetworkIntelligenceReport {
        val local = localDetector.analyze()
        val vpn = vpnMonitor.verify()
        val packet = packetModeler.model()
        val alerts = mutableListOf<String>()
        alerts += local.alerts
        alerts += vpn.alerts
        alerts += packet.alerts
        return NetworkIntelligenceReport(local, vpn, packet, alerts)
    }
}

data class NetworkIntelligenceReport(
    val localNetwork: LocalNetworkThreatReport,
    val vpnReport: VpnIntegrityReport,
    val packetReport: PacketBehaviorReport,
    val alerts: List<String>
)

data class LocalNetworkThreatReport(
    val rogueDhcp: Boolean,
    val arpChanges: Boolean,
    val dnsPoisoning: Boolean,
    val mitmSignals: Boolean,
    val unknownDevices: List<String>,
    val alerts: List<String>
)

data class VpnIntegrityReport(
    val tunnelActive: Boolean,
    val dnsLeak: Boolean,
    val ipv6Leak: Boolean,
    val certMismatch: Boolean,
    val geoMismatch: Boolean,
    val alerts: List<String>
)

data class PacketBehaviorReport(
    val beaconingDetected: Boolean,
    val botnetShape: Boolean,
    val idlePersistentSessions: Boolean,
    val exfilBursts: Boolean,
    val alerts: List<String>
)

private class LocalNetworkThreatDetector(private val context: Context) {
    fun analyze(): LocalNetworkThreatReport {
        val wifiManager = context.applicationContext.getSystemService(WifiManager::class.java)
        val dhcpInfo = wifiManager?.dhcpInfo
        val alerts = mutableListOf<String>()
        val rogueDhcp = dhcpInfo?.gateway == 0
        if (rogueDhcp) alerts += "Gateway missing in DHCP lease"

        val arpChanges = detectArpShift(alerts)
        val dnsPoisoning = detectDnsPoisoning(dhcpInfo, alerts)
        val mitm = detectMitmSignatures(alerts)
        val unknownDevices = readArpTable()

        if (unknownDevices.isNotEmpty()) {
            alerts += "Unknown LAN devices: ${'$'}{unknownDevices.size}"
        }
        return LocalNetworkThreatReport(rogueDhcp, arpChanges, dnsPoisoning, mitm, unknownDevices, alerts)
    }

    private fun detectArpShift(alerts: MutableList<String>): Boolean {
        return try {
            val arpFile = File("/proc/net/arp")
            val entries = arpFile.readLines().drop(1)
            val suspicious = entries.count { it.contains(" 0x0 ") }
            if (suspicious > 0) alerts += "Incomplete ARP entries detected"
            suspicious > 2
        } catch (ex: Exception) {
            false
        }
    }

    private fun detectDnsPoisoning(dhcpInfo: android.net.DhcpInfo?, alerts: MutableList<String>): Boolean {
        val info = dhcpInfo ?: return false
        val dns1 = info.dns1
        val dns2 = info.dns2
        val gateway = info.gateway
        val unusual = dns1 == 0 || dns1 == gateway
        val mismatch = dns2 != 0 && dns1 != dns2
        if (unusual || mismatch) alerts += "DNS servers look suspicious"
        return unusual || mismatch
    }

    private fun detectMitmSignatures(alerts: MutableList<String>): Boolean {
        val certsDir = File("/system/etc/security/cacerts")
        val suspicious = certsDir.listFiles()?.count { it.name.contains("mitm") } ?: 0
        if (suspicious > 0) alerts += "MITM root certificates installed"
        return suspicious > 0
    }

    private fun readArpTable(): List<String> {
        return try {
            val arp = File("/proc/net/arp").readLines().drop(1)
            arp.mapNotNull { line ->
                val parts = line.split(" ").filter { it.isNotEmpty() }
                parts.getOrNull(0)?.takeIf { !it.startsWith("0.0.0.0") }
            }
        } catch (ex: Exception) {
            emptyList()
        }
    }
}

private class VpnIntegrityMonitor(private val context: Context) {
    fun verify(): VpnIntegrityReport {
        val connectivity = context.getSystemService(ConnectivityManager::class.java)
        val active = connectivity?.activeNetwork
        val capabilities = active?.let { connectivity.getNetworkCapabilities(it) }
        val tunnelActive = capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_VPN) == true
        val linkProperties = active?.let { connectivity.getLinkProperties(it) }
        val dnsLeak = linkProperties?.dnsServers?.any { it.isSiteLocalAddress } == true
        val ipv6Leak = linkProperties?.linkAddresses?.any { it.address is Inet6Address } == true && !tunnelActive
        val certMismatch = false // real detection would inspect TLS handshakes
        val geoMismatch = detectGeoMismatch(linkProperties)
        val alerts = mutableListOf<String>()
        if (!tunnelActive) alerts += "VPN tunnel not active"
        if (dnsLeak) alerts += "DNS requests leaking"
        if (ipv6Leak) alerts += "IPv6 traffic bypassing tunnel"
        if (geoMismatch) alerts += "VPN exit node differs from expected region"
        return VpnIntegrityReport(tunnelActive, dnsLeak, ipv6Leak, certMismatch, geoMismatch, alerts)
    }

    private fun detectGeoMismatch(linkProperties: android.net.LinkProperties?): Boolean {
        val domains = linkProperties?.dnsServers ?: return false
        return domains.any { server ->
            val host = server.hostAddress ?: return@any false
            !(host.startsWith("10.") || host.startsWith("192.168"))
        }
    }
}

private class PacketBehaviorModeler(private val context: Context) {
    private val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun model(): PacketBehaviorReport {
        val previousTx = prefs.getLong(KEY_TX, 0L)
        val previousRx = prefs.getLong(KEY_RX, 0L)
        val nowTx = TrafficStats.getTotalTxBytes()
        val nowRx = TrafficStats.getTotalRxBytes()
        prefs.edit().putLong(KEY_TX, nowTx).putLong(KEY_RX, nowRx).apply()

        val txDelta = (nowTx - previousTx).coerceAtLeast(0)
        val rxDelta = (nowRx - previousRx).coerceAtLeast(0)
        val total = txDelta + rxDelta
        val beaconing = total > 0 && txDelta < 5_000 && rxDelta < 5_000 && total > 0
        val bursts = txDelta > 5_000_000 || rxDelta > 5_000_000
        val idlePersistent = total == 0L && prefs.getBoolean(KEY_IDLE, false)
        prefs.edit().putBoolean(KEY_IDLE, total == 0L).apply()

        val alerts = mutableListOf<String>()
        if (beaconing) alerts += "High-frequency small packets"
        if (bursts) alerts += "Large data exfiltration burst"
        if (idlePersistent) alerts += "Persistent TLS session idle"
        return PacketBehaviorReport(beaconing, false, idlePersistent, bursts, alerts)
    }

    companion object {
        private const val PREFS = "packet_model"
        private const val KEY_TX = "tx"
        private const val KEY_RX = "rx"
        private const val KEY_IDLE = "idle"
    }
}
