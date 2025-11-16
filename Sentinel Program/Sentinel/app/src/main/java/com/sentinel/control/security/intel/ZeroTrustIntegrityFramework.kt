package com.sentinel.control.security.intel

import android.app.ActivityManager
import android.content.Context
import java.io.File

class ZeroTrustIntegrityFramework(private val context: Context) {
    private val rootMonitor = RootIntegrityMonitor()
    private val memoryMonitor = MemoryIntegrityMonitor(context)

    fun evaluate(): ZeroTrustIntegrityReport {
        val rootReport = rootMonitor.inspect()
        val memoryReport = memoryMonitor.pulse()
        return ZeroTrustIntegrityReport(rootReport, memoryReport)
    }
}

data class ZeroTrustIntegrityReport(
    val rootDetection: RootIntegrityReport,
    val memoryPulse: MemoryPulseReport
) {
    val aggregatedMessages: List<String>
        get() = rootDetection.flags + memoryPulse.flags
}

data class RootIntegrityReport(
    val rootArtifactsDetected: Boolean,
    val flags: List<String>,
    val selinuxTampered: Boolean,
    val debugProps: Boolean,
    val zygiskLayers: Boolean
) {
    val riskScore: Int
        get() {
            var score = 0
            if (rootArtifactsDetected) score += 40
            if (selinuxTampered) score += 20
            if (debugProps) score += 10
            if (zygiskLayers) score += 20
            return score.coerceIn(0, 100)
        }
}

data class MemoryPulseReport(
    val suspiciousProcesses: List<String>,
    val executableRegions: Boolean,
    val binderAnomalies: Boolean,
    val flags: List<String>
)

private class RootIntegrityMonitor {
    fun inspect(): RootIntegrityReport {
        val flags = mutableListOf<String>()
        val rootArtifacts = checkSuBinary(flags) || checkMountPoints(flags)
        val selinuxTampered = !checkSelinux(flags)
        val debugProps = checkDebugProps(flags)
        val zygiskLayers = detectZygisk(flags)
        return RootIntegrityReport(rootArtifacts, flags, selinuxTampered, debugProps, zygiskLayers)
    }

    private fun checkSuBinary(flags: MutableList<String>): Boolean {
        val paths = listOf(
            "/system/bin/su",
            "/system/xbin/su",
            "/sbin/su",
            "/system/bin/.ext/.su"
        )
        val detected = paths.any { File(it).exists() }
        if (detected) flags += "su binary present"
        return detected
    }

    private fun checkMountPoints(flags: MutableList<String>): Boolean {
        return try {
            val mounts = File("/proc/mounts").readText()
            val anomalies = mounts.lines().filter { it.contains("/system") && it.contains("rw") }
            if (anomalies.isNotEmpty()) {
                flags += "System partition remounted read-write"
            }
            anomalies.isNotEmpty()
        } catch (ex: Exception) {
            false
        }
    }

    private fun checkSelinux(flags: MutableList<String>): Boolean {
        return try {
            val process = Runtime.getRuntime().exec("getenforce")
            val mode = process.inputStream.bufferedReader().use { it.readText().trim() }
            val enforcing = mode.equals("enforcing", ignoreCase = true)
            if (!enforcing) flags += "SELinux not enforcing"
            enforcing
        } catch (ex: Exception) {
            flags += "Unable to verify SELinux"
            false
        }
    }

    private fun checkDebugProps(flags: MutableList<String>): Boolean {
        val props = listOf(
            systemProperty("ro.debuggable"),
            systemProperty("ro.secure")
        )
        val debugBuild = props.any { it == "1" || it == "0" }
        if (debugBuild) flags += "Debuggable system properties present"
        return debugBuild
    }

    private fun systemProperty(name: String): String {
        return try {
            val clazz = Class.forName("android.os.SystemProperties")
            val method = clazz.getMethod("get", String::class.java)
            method.invoke(null, name) as? String ?: ""
        } catch (ex: Exception) {
            ""
        }
    }

    private fun detectZygisk(flags: MutableList<String>): Boolean {
        val libs = System.getProperty("java.library.path") ?: return false
        val detected = libs.contains("zygisk") || libs.contains("magisk")
        if (detected) flags += "Magisk/Zygisk artifacts detected"
        return detected
    }
}

private class MemoryIntegrityMonitor(private val context: Context) {
    fun pulse(): MemoryPulseReport {
        val suspicious = mutableListOf<String>()
        val flags = mutableListOf<String>()
        val activityManager = context.getSystemService(ActivityManager::class.java)
        val processes = activityManager?.runningAppProcesses ?: emptyList()
        processes.forEach { processInfo ->
            if (processInfo.processName.contains("frida", ignoreCase = true) ||
                processInfo.processName.contains("xposed", ignoreCase = true)
            ) {
                suspicious += processInfo.processName
            }
        }

        val executableRegions = detectExecutableRegions(flags)
        val binderAnomalies = detectBinderUsage(flags)
        return MemoryPulseReport(suspicious, executableRegions, binderAnomalies, flags + suspicious)
    }

    private fun detectExecutableRegions(flags: MutableList<String>): Boolean {
        return try {
            val file = File("/proc/${android.os.Process.myPid()}/maps")
            val suspicious = file.useLines { lines ->
                lines.any { it.contains("rwxp") }
            }
            if (suspicious) flags += "Process contains RWX memory"
            suspicious
        } catch (ex: Exception) {
            false
        }
    }

    private fun detectBinderUsage(flags: MutableList<String>): Boolean {
        return try {
            val binderStats = File("/sys/kernel/debug/binder/stats")
            if (!binderStats.exists()) return false
            val anomalies = binderStats.readLines().filter { it.contains("proc") && it.contains("transaction") }
            val abnormal = anomalies.count { it.contains("FAILED") } > 3
            if (abnormal) flags += "Abnormal binder transactions"
            abnormal
        } catch (ex: Exception) {
            false
        }
    }
}
