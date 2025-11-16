package com.sentinel.control.security.intel

import android.content.Context
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.content.pm.PermissionInfo
import android.os.Build
import android.provider.Settings
import com.sentinel.control.logging.SentinelLogger
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedInputStream
import java.io.File
import java.io.FileInputStream
import java.security.MessageDigest
import java.util.Locale
import java.util.concurrent.ConcurrentHashMap
import java.util.zip.ZipInputStream

class ThreatSurfaceMonitor(private val context: Context) {
    private val permissionScanner = PermissionDeltaScanner(context)
    private val apiMonitor = SystemApiAbuseMonitor(context)
    private val fingerprintEngine = ExecutableFingerprintEngine(context)

    suspend fun snapshot(): ThreatSurfaceReport = withContext(Dispatchers.IO) {
        val permissionDelta = permissionScanner.scan()
        val apiAbuse = apiMonitor.inspect()
        val fingerprints = fingerprintEngine.fingerprint()
        ThreatSurfaceReport(permissionDelta, apiAbuse, fingerprints)
    }
}

data class ThreatSurfaceReport(
    val permissionDelta: PermissionDeltaReport,
    val apiAbuse: SystemApiAbuseReport,
    val fingerprints: List<ExecutableFingerprint>
) {
    val riskScore: Int
        get() {
            var score = 0
            score += permissionDelta.newDangerousPermissions.size * 8
            if (permissionDelta.uidImpersonationAttempts.isNotEmpty()) score += 25
            if (apiAbuse.accessibilityHijackers.isNotEmpty()) score += 20
            if (apiAbuse.overlayAbuse) score += 10
            score += fingerprints.count { it.suspiciousStrings.isNotEmpty() } * 5
            return score.coerceIn(0, 100)
        }

    val aggregatedMessages: List<String>
        get() {
            val messages = mutableListOf<String>()
            if (permissionDelta.newDangerousPermissions.isNotEmpty()) {
                messages += "Permission escalations detected: ${'$'}{permissionDelta.newDangerousPermissions.keys.joinToString()}"
            }
            if (permissionDelta.uidImpersonationAttempts.isNotEmpty()) {
                messages += "UID collisions: ${'$'}{permissionDelta.uidImpersonationAttempts.joinToString()}"
            }
            if (apiAbuse.accessibilityHijackers.isNotEmpty()) {
                messages += "Accessibility services enabled: ${'$'}{apiAbuse.accessibilityHijackers.joinToString()}"
            }
            if (apiAbuse.overlayAbuse) {
                messages += "Overlay permission abused"
            }
            if (fingerprints.any { it.abnormalCertificateChain }) {
                messages += "APK signatures changed on ${'$'}{fingerprints.count { it.abnormalCertificateChain }} packages"
            }
            return messages
        }
}

data class PermissionDeltaReport(
    val newDangerousPermissions: Map<String, List<String>>,
    val revokedPermissions: Map<String, List<String>>,
    val exportedComponentChanges: List<String>,
    val uidImpersonationAttempts: List<String>
) {
    fun describe(): String {
        return buildString {
            if (newDangerousPermissions.isNotEmpty()) {
                append("New dangerous permissions: ")
                append(newDangerousPermissions.entries.joinToString { "${'$'}{it.key} -> ${'$'}{it.value.joinToString()}" })
            }
            if (uidImpersonationAttempts.isNotEmpty()) {
                append(" | UID overlaps: ${'$'}{uidImpersonationAttempts.joinToString()} ")
            }
            if (exportedComponentChanges.isNotEmpty()) {
                append(" | Exported toggles: ${'$'}{exportedComponentChanges.joinToString()} ")
            }
        }.ifEmpty { "No permission delta" }
    }
}

data class SystemApiAbuseReport(
    val accessibilityHijackers: List<String>,
    val notificationListeners: List<String>,
    val mediaProjectionListeners: List<String>,
    val overlayAbuse: Boolean,
    val keyloggingVectors: List<String>
)

data class ExecutableFingerprint(
    val packageName: String,
    val sha256: String,
    val suspiciousStrings: List<String>,
    val abnormalCertificateChain: Boolean
)

private class PermissionDeltaScanner(private val context: Context) {
    private val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    private val packageManager = context.packageManager

    suspend fun scan(): PermissionDeltaReport = withContext(Dispatchers.IO) {
        val installed = packageManager.getInstalledPackages(PackageManager.GET_PERMISSIONS or PackageManager.GET_ACTIVITIES)
        val previousSnapshot = loadSnapshot()
        val currentSnapshot = ConcurrentHashMap<String, Set<String>>()
        val newPermissions = mutableMapOf<String, List<String>>()
        val revokedPermissions = mutableMapOf<String, List<String>>()
        val exportedChanges = mutableListOf<String>()
        val uidCollisions = mutableListOf<String>()
        val uidMap = mutableMapOf<Int, String>()

        installed.forEach { pkg ->
            val dangerous = pkg.extractDangerousPermissions()
            currentSnapshot[pkg.packageName] = dangerous
            val previous = previousSnapshot[pkg.packageName] ?: emptySet()
            val newDelta = (dangerous - previous).toList()
            if (newDelta.isNotEmpty()) {
                newPermissions[pkg.packageName] = newDelta
            }
            val revoked = (previous - dangerous).toList()
            if (revoked.isNotEmpty()) revokedPermissions[pkg.packageName] = revoked

            if (pkg.activities != null && pkg.activities!!.any { it.exported }) {
                exportedChanges += pkg.packageName
            }

            val owner = uidMap[pkg.applicationInfo.uid]
            if (owner != null && owner != pkg.packageName) {
                uidCollisions += "${'$'}{pkg.packageName} shares UID with ${'$'}owner"
            } else {
                uidMap[pkg.applicationInfo.uid] = pkg.packageName
            }
        }

        persistSnapshot(currentSnapshot)
        PermissionDeltaReport(newPermissions, revokedPermissions, exportedChanges.distinct(), uidCollisions)
    }

    private fun PackageInfo.extractDangerousPermissions(): Set<String> {
        val requested = requestedPermissions ?: return emptySet()
        val flags = requestedPermissionsFlags ?: IntArray(0)
        val dangerous = mutableSetOf<String>()
        requested.forEachIndexed { index, perm ->
            val granted = index < flags.size && (flags[index] and PackageInfo.REQUESTED_PERMISSION_GRANTED) != 0
            if (!granted) return@forEachIndexed
            try {
                val info = packageManager.getPermissionInfo(perm, 0)
                val isDangerous = (info.protectionLevel and PermissionInfo.PROTECTION_MASK_BASE) == PermissionInfo.PROTECTION_DANGEROUS
                if (isDangerous) {
                    dangerous += perm
                }
            } catch (ignored: Exception) {
                // Ignore system permissions we cannot resolve
            }
        }
        return dangerous
    }

    private fun persistSnapshot(snapshot: Map<String, Set<String>>) {
        val json = JSONObject()
        snapshot.forEach { (pkg, perms) -> json.put(pkg, JSONArray(perms.toList())) }
        prefs.edit().putString(KEY_SNAPSHOT, json.toString()).apply()
    }

    private fun loadSnapshot(): Map<String, Set<String>> {
        val stored = prefs.getString(KEY_SNAPSHOT, null) ?: return emptyMap()
        return runCatching {
            val json = JSONObject(stored)
            json.keys().asSequence().associateWith { key ->
                val array = json.getJSONArray(key)
                (0 until array.length()).map { array.getString(it) }.toSet()
            }
        }.getOrElse { emptyMap() }
    }

    companion object {
        private const val PREFS = "permission_delta"
        private const val KEY_SNAPSHOT = "snapshot"
    }
}

private class SystemApiAbuseMonitor(private val context: Context) {
    suspend fun inspect(): SystemApiAbuseReport = withContext(Dispatchers.Default) {
        val accessibilityServices = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        )?.split(':')?.filter { it.isNotBlank() } ?: emptyList()

        val notificationListeners = Settings.Secure.getString(
            context.contentResolver,
            "enabled_notification_listeners"
        )?.split(':')?.filter { it.isNotBlank() } ?: emptyList()

        val mediaProjection = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            Settings.Secure.getString(context.contentResolver, "media_projection")?.let { listOf(it) }
        } else emptyList()

        val overlayAbuse = try {
            Settings.canDrawOverlays(context)
        } catch (ex: Exception) {
            false
        }

        val keyloggingVectors = accessibilityServices.filter { !it.startsWith(context.packageName) }
        SystemApiAbuseReport(
            accessibilityHijackers = keyloggingVectors,
            notificationListeners = notificationListeners,
            mediaProjectionListeners = mediaProjection ?: emptyList(),
            overlayAbuse = overlayAbuse,
            keyloggingVectors = keyloggingVectors
        )
    }
}

private class ExecutableFingerprintEngine(private val context: Context) {
    private val packageManager = context.packageManager

    suspend fun fingerprint(): List<ExecutableFingerprint> = withContext(Dispatchers.IO) {
        val packages = packageManager.getInstalledPackages(PackageManager.GET_SIGNING_CERTIFICATES)
        packages.take(MAX_PACKAGES).map { pkg ->
            val sourceDir = pkg.applicationInfo?.sourceDir
            val hash = sourceDir?.let { sha256(File(it)) } ?: "unknown"
            val suspiciousStrings = sourceDir?.let { collectSuspiciousStrings(File(it)) } ?: emptyList()
            val abnormalChain = pkg.signingInfo?.signingCertificateHistory?.size ?: 0 > 1
            ExecutableFingerprint(pkg.packageName, hash, suspiciousStrings, abnormalChain)
        }
    }

    private fun sha256(file: File): String {
        return try {
            val digest = MessageDigest.getInstance("SHA-256")
            BufferedInputStream(FileInputStream(file)).use { input ->
                val buffer = ByteArray(8 * 1024)
                var read: Int
                while (input.read(buffer).also { read = it } != -1) {
                    digest.update(buffer, 0, read)
                }
            }
            digest.digest().joinToString(separator = "") { String.format("%02x", it) }
        } catch (ex: Exception) {
            SentinelLogger.warn("Unable to hash ${'$'}file", ex)
            "error"
        }
    }

    private fun collectSuspiciousStrings(file: File): List<String> {
        return runCatching {
            val hits = mutableSetOf<String>()
            ZipInputStream(FileInputStream(file)).use { zip ->
                var entry = zip.nextEntry
                var inspected = 0
                while (entry != null && inspected < 50) {
                    inspected++
                    val name = entry.name.lowercase(Locale.getDefault())
                    if (SUSPICIOUS_MARKERS.any { marker -> name.contains(marker) }) {
                        hits += name
                    }
                    entry = zip.nextEntry
                }
            }
            hits.toList()
        }.getOrElse { emptyList() }
    }

    companion object {
        private const val MAX_PACKAGES = 35
        private val SUSPICIOUS_MARKERS = listOf("zygisk", "frida", "substrate", "keylogger", "xposed")
    }
}
