package com.sentinel.control.network

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.wifi.WifiManager
import android.util.Log
import java.net.Socket

sealed interface NetworkStatus {
    object Unchecked : NetworkStatus
    data class Healthy(val ip: String, val ssid: String?, val latencyMs: Long) : NetworkStatus
    data class Unreachable(val reason: String) : NetworkStatus
}

fun NetworkStatus.describe(): String = when (this) {
    NetworkStatus.Unchecked -> "Not yet evaluated"
    is NetworkStatus.Healthy -> "${'$'}ip on ${'$'}ssid latency ${'$'}latencyMs ms"
    is NetworkStatus.Unreachable -> "Unavailable: ${'$'}reason"
}

class NetworkDiagnostics(private val context: Context) {

    fun check(): NetworkStatus {
        val cm = context.getSystemService(ConnectivityManager::class.java)
        val active = cm.activeNetwork ?: return NetworkStatus.Unreachable("No active network")
        val caps = cm.getNetworkCapabilities(active) ?: return NetworkStatus.Unreachable("No capabilities")
        if (!caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)) {
            return NetworkStatus.Unreachable("No internet capability")
        }
        val wifi = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
        val ssid = wifi.connectionInfo?.ssid
        val ip = wifi.connectionInfo?.ipAddress?.let { intToIp(it) } ?: "unknown"

        return try {
            val latency = measureLatency("sentinel-pi.local", 443)
            NetworkStatus.Healthy(ip, ssid, latency)
        } catch (ex: Exception) {
            Log.w(TAG, "Latency check failed", ex)
            NetworkStatus.Unreachable(ex.message ?: "latency error")
        }
    }

    private fun intToIp(ip: Int): String {
        return listOf(
            ip and 0xff,
            ip shr 8 and 0xff,
            ip shr 16 and 0xff,
            ip shr 24 and 0xff
        ).joinToString(".")
    }

    private fun measureLatency(host: String, port: Int): Long {
        val start = System.currentTimeMillis()
        Socket(host, port).use { }
        return System.currentTimeMillis() - start
    }

    fun whitelistNetwork(address: String) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val updated = (prefs.getStringSet(WHITELIST_KEY, emptySet()) ?: emptySet()).toMutableSet()
        updated += address
        prefs.edit().putStringSet(WHITELIST_KEY, updated).apply()
    }

    fun getWhitelistedNetworks(): Set<String> {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        return prefs.getStringSet(WHITELIST_KEY, emptySet()) ?: emptySet()
    }

    companion object {
        private const val PREFS = "network_whitelist"
        private const val WHITELIST_KEY = "whitelist"
        private const val TAG = "NetworkDiagnostics"
    }
}
