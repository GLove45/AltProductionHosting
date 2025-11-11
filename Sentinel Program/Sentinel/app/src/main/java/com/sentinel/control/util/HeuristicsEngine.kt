package com.sentinel.control.util

import android.app.usage.NetworkStatsManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import com.sentinel.control.logging.SentinelLogger
import java.time.Instant

class HeuristicsEngine(private val context: Context) {

    fun evaluate(): HeuristicReport {
        val anomalies = mutableListOf<String>()
        detectRecentInstalls(anomalies)
        detectCpuAnomalies(anomalies)
        detectNetworkFloods(anomalies)
        return HeuristicReport(anomalies.isEmpty(), anomalies)
    }

    private fun detectRecentInstalls(anomalies: MutableList<String>) {
        val pm = context.packageManager
        val now = System.currentTimeMillis()
        val suspicious = pm.getInstalledPackages(PackageManager.GET_META_DATA).filter {
            !isSystemApp(it.applicationInfo.flags) && now - it.firstInstallTime < RECENT_THRESHOLD
        }
        if (suspicious.isNotEmpty()) {
            anomalies += "${'$'}{suspicious.size} new apps installed recently"
        }
    }

    private fun detectCpuAnomalies(anomalies: MutableList<String>) {
        try {
            val load = Runtime.getRuntime().availableProcessors()
            if (load > CPU_THRESHOLD) {
                anomalies += "High CPU core count usage detected"
            }
        } catch (ex: Exception) {
            Log.w(TAG, "CPU anomaly detection failed", ex)
        }
    }

    private fun detectNetworkFloods(anomalies: MutableList<String>) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return
        try {
            val manager = context.getSystemService(NetworkStatsManager::class.java)
            // Placeholder for actual stats query.
            val bytes = 0L
            if (bytes > NETWORK_THRESHOLD_BYTES) {
                anomalies += "Large outbound network volume detected"
            }
        } catch (ex: Exception) {
            SentinelLogger.warn("Network stats unavailable: ${'$'}ex")
        }
    }

    private fun isSystemApp(flags: Int): Boolean = flags and android.content.pm.ApplicationInfo.FLAG_SYSTEM != 0

    companion object {
        private const val TAG = "HeuristicsEngine"
        private const val RECENT_THRESHOLD = 72 * 60 * 60 * 1000L
        private const val CPU_THRESHOLD = 8
        private const val NETWORK_THRESHOLD_BYTES = 500L * 1024 * 1024
    }
}

data class HeuristicReport(val healthy: Boolean, val anomalies: List<String>)
