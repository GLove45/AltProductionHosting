package com.altproductionlabs.sentinellite.engine

import android.app.usage.UsageStats
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import android.text.format.DateUtils
import androidx.annotation.RequiresPermission
import com.altproductionlabs.sentinellite.core.AppPermissionRisk
import com.altproductionlabs.sentinellite.core.AppUsageStat
import com.altproductionlabs.sentinellite.core.DeviceIntegrityStatus
import com.altproductionlabs.sentinellite.core.MonitoringSnapshot
import com.altproductionlabs.sentinellite.core.SignalSource
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.util.concurrent.TimeUnit

class LocalMonitoringEngine(private val context: Context) : SignalSource<MonitoringSnapshot> {

    private val packageManager: PackageManager = context.packageManager

    @RequiresPermission(allOf = [android.Manifest.permission.PACKAGE_USAGE_STATS])
    override suspend fun collect(): MonitoringSnapshot = withContext(Dispatchers.Default) {
        val now = System.currentTimeMillis()
        val apps = packageManager.getInstalledApplications(PackageManager.GET_META_DATA)

        val risks = apps.mapNotNull { app ->
            val permissions = try {
                packageManager.getPackageInfo(app.packageName, PackageManager.GET_PERMISSIONS).requestedPermissions?.toList()
                    ?: emptyList()
            } catch (ex: Exception) {
                emptyList()
            }

            val info = packageManager.getApplicationInfo(app.packageName, 0)
            val label = packageManager.getApplicationLabel(info).toString()
            val hasSms = permissions.any { it.contains("SMS", true) }
            val hasContacts = permissions.any { it.contains("CONTACT", true) }
            val isDebuggable = info.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0
            if (hasSms || hasContacts || isDebuggable) {
                AppPermissionRisk(
                    packageName = app.packageName,
                    label = label,
                    requestedPermissions = permissions,
                    lastUpdateTime = try {
                        packageManager.getPackageInfo(app.packageName, 0).lastUpdateTime
                    } catch (ex: Exception) {
                        0L
                    },
                    isSystemApp = info.flags and ApplicationInfo.FLAG_SYSTEM != 0,
                    hasSmsAccess = hasSms,
                    hasContactsAccess = hasContacts,
                    isDebuggable = isDebuggable,
                    source = "PackageManager"
                )
            } else {
                null
            }
        }

        val recentWindow = TimeUnit.MINUTES.toMillis(15)
        val newInstalls = risks.filter { now - it.lastUpdateTime <= recentWindow }
        val integrityStatus = evaluateIntegrity(risks)
        val usageStats = collectUsageStats()

        MonitoringSnapshot(
            collectedAt = now,
            newInstalls = newInstalls,
            riskyPermissions = risks,
            integrityStatus = integrityStatus,
            usageSummary = usageStats
        )
    }

    private fun collectUsageStats(): List<AppUsageStat> {
        val usageManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
            ?: return emptyList()
        val end = System.currentTimeMillis()
        val start = end - DateUtils.DAY_IN_MILLIS
        val stats: List<UsageStats> = usageManager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, start, end)
        return stats.map {
            AppUsageStat(
                packageName = it.packageName,
                lastUsedAt = it.lastTimeUsed,
                totalForegroundMinutes = TimeUnit.MILLISECONDS.toMinutes(it.totalTimeInForeground)
            )
        }.sortedByDescending { it.lastUsedAt }
    }

    private fun evaluateIntegrity(riskyApps: List<AppPermissionRisk>): DeviceIntegrityStatus {
        val evidence = mutableListOf<String>()
        val rooted = isRooted(evidence)
        val bootloaderUnlocked = isOemUnlockAllowed()
        val systemDebuggable = BuildConfigFlags.isDebuggable
        return DeviceIntegrityStatus(
            debuggableApps = riskyApps.filter { it.isDebuggable },
            isDeviceDebuggable = systemDebuggable,
            isBootloaderUnlocked = bootloaderUnlocked,
            appearsRooted = rooted,
            evidence = evidence
        )
    }

    private fun isOemUnlockAllowed(): Boolean = try {
        Settings.Global.getInt(context.contentResolver, Settings.Global.OEM_UNLOCK_ALLOWED) == 1
    } catch (ex: Exception) {
        false
    }

    private fun isRooted(evidence: MutableList<String>): Boolean {
        val rootPaths = listOf(
            "/system/bin/su",
            "/system/xbin/su",
            "/sbin/su",
            "/system/app/Superuser.apk"
        )
        val exists = rootPaths.any { path ->
            val file = File(path)
            if (file.exists()) {
                evidence += "Found su binary at $path"
                true
            } else {
                false
            }
        }
        return exists
    }

    object BuildConfigFlags {
        val isDebuggable: Boolean = (android.os.Build.TYPE == "eng" || android.os.Build.TYPE == "userdebug")
    }
}
