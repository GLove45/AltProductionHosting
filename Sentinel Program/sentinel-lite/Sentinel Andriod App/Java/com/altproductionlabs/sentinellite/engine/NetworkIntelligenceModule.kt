package com.altproductionlabs.sentinellite.engine

import android.Manifest
import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.wifi.WifiInfo
import android.net.wifi.WifiManager
import androidx.annotation.RequiresPermission
import com.altproductionlabs.sentinellite.core.AppTrafficStat
import com.altproductionlabs.sentinellite.core.NetworkSnapshot
import com.altproductionlabs.sentinellite.core.SignalSource
import com.altproductionlabs.sentinellite.core.WifiSecurity
import com.altproductionlabs.sentinellite.core.describeTransports
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import android.net.TrafficStats
import android.os.Build

class NetworkIntelligenceModule(private val context: Context) : SignalSource<NetworkSnapshot> {

    private val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
    private val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

    @RequiresPermission(allOf = [Manifest.permission.ACCESS_NETWORK_STATE, Manifest.permission.ACCESS_WIFI_STATE])
    override suspend fun collect(): NetworkSnapshot = withContext(Dispatchers.IO) {
        val now = System.currentTimeMillis()
        val network = connectivityManager.activeNetwork
        val caps = connectivityManager.getNetworkCapabilities(network)
        val wifiInfo = wifiManager?.connectionInfo
        val issues = mutableListOf<String>()
        val isVpn = caps?.hasTransport(NetworkCapabilities.TRANSPORT_VPN) == true
        val ssid = wifiInfo?.ssid?.removePrefix("\"")?.removeSuffix("\"")

        if (ssid != null && (wifiInfo?.networkId ?: -1) == -1) {
            issues += "Connected to unknown Wi-Fi profile"
        }
        if (ssid != null && determineSecurity(wifiInfo) == WifiSecurity.OPEN) {
            issues += "Wi-Fi network is open"
        }
        if (!isVpn) {
            issues += "VPN not detected"
        }

        val traffic = collectTrafficPerUid()

        NetworkSnapshot(
            collectedAt = now,
            ssid = ssid,
            bssid = wifiInfo?.bssid,
            security = determineSecurity(wifiInfo),
            isVpnActive = isVpn,
            networkType = when {
                caps?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true -> NetworkCapabilities.TRANSPORT_WIFI
                caps?.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) == true -> NetworkCapabilities.TRANSPORT_CELLULAR
                else -> -1
            },
            metered = connectivityManager.isActiveNetworkMetered,
            transportFlags = caps?.describeTransports() ?: emptyList(),
            trafficSummary = traffic,
            issues = issues
        )
    }

    private fun determineSecurity(info: WifiInfo?): WifiSecurity {
        if (info == null) return WifiSecurity.UNKNOWN
        val isOpen = info.hiddenSSID.not() && info.currentSecurityType() == WifiSecurity.OPEN
        return when {
            isOpen -> WifiSecurity.OPEN
            info.currentSecurityType() == WifiSecurity.WPA3 -> WifiSecurity.WPA3
            info.currentSecurityType() == WifiSecurity.WPA2 -> WifiSecurity.WPA2
            info.currentSecurityType() == WifiSecurity.WPA -> WifiSecurity.WPA
            info.currentSecurityType() == WifiSecurity.WEP -> WifiSecurity.WEP
            else -> WifiSecurity.UNKNOWN
        }
    }

    private fun WifiInfo.currentSecurityType(): WifiSecurity {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return when (securityType) {
                WifiInfo.SECURITY_TYPE_WPA3 -> WifiSecurity.WPA3
                WifiInfo.SECURITY_TYPE_WPA2 -> WifiSecurity.WPA2
                WifiInfo.SECURITY_TYPE_WPA -> WifiSecurity.WPA
                WifiInfo.SECURITY_TYPE_WEP -> WifiSecurity.WEP
                WifiInfo.SECURITY_TYPE_OPEN -> WifiSecurity.OPEN
                else -> WifiSecurity.UNKNOWN
            }
        }
        return WifiSecurity.UNKNOWN
    }

    private fun collectTrafficPerUid(): List<AppTrafficStat> {
        val appStats = mutableListOf<AppTrafficStat>()
        val packages = context.packageManager.getInstalledApplications(0)
        packages.forEach { app ->
            val rx = TrafficStats.getUidRxBytes(app.uid)
            val tx = TrafficStats.getUidTxBytes(app.uid)
            if (rx > 0 || tx > 0) {
                appStats += AppTrafficStat(
                    uid = app.uid,
                    packageName = app.packageName,
                    rxBytes = rx,
                    txBytes = tx
                )
            }
        }
        return appStats.sortedByDescending { it.rxBytes + it.txBytes }.take(10)
    }
}
