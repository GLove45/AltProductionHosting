package com.altproductionlabs.sentinellite.security

import android.app.admin.DeviceAdminReceiver
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
import android.widget.Toast
import androidx.core.content.edit
import com.altproductionlabs.sentinellite.core.AdminLoginState
import com.altproductionlabs.sentinellite.core.AdminPolicy
import com.altproductionlabs.sentinellite.core.DeviceOwnerState
import com.altproductionlabs.sentinellite.core.MonitoredApp
import com.altproductionlabs.sentinellite.core.PolicyStatus
import com.altproductionlabs.sentinellite.core.TokenType
import java.security.MessageDigest
import java.util.UUID

class DeviceOwnerManager(private val context: Context) {

    private val prefs = context.getSharedPreferences("sentinel_device_owner", Context.MODE_PRIVATE)
    private val packageManager: PackageManager = context.packageManager
    private val devicePolicyManager = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
    private val adminComponent = ComponentName(context, SentinelDeviceAdminReceiver::class.java)

    private val defaultPolicies = listOf(
        AdminPolicy(
            id = "vpn_required",
            title = "VPN required",
            description = "All corporate traffic must egress via the Sentinel VPN tunnel.",
            enforced = true,
            lastUpdated = System.currentTimeMillis(),
            violations = 0
        ),
        AdminPolicy(
            id = "block_unknown_sources",
            title = "Block unknown sources",
            description = "Disable sideloading and enforce Play Protect scanning.",
            enforced = true,
            lastUpdated = System.currentTimeMillis(),
            violations = 0
        ),
        AdminPolicy(
            id = "screen_lock",
            title = "Strong screen lock",
            description = "Require complex passcode with 60 second auto-lock.",
            enforced = true,
            lastUpdated = System.currentTimeMillis(),
            violations = 0
        ),
        AdminPolicy(
            id = "app_monitoring",
            title = "Continuous app monitoring",
            description = "Collect telemetry for every installed application and quarantine threats.",
            enforced = true,
            lastUpdated = System.currentTimeMillis(),
            violations = 0
        )
    )

    init {
        ensurePolicyDefaults(System.currentTimeMillis())
    }

    fun currentState(): DeviceOwnerState {
        val loginState = readLoginState()
        return DeviceOwnerState(
            adminName = prefs.getString(KEY_ADMIN_NAME, "Sentinel Administrator") ?: "Sentinel Administrator",
            isDeviceOwner = prefs.getBoolean(KEY_IS_OWNER, false) || devicePolicyManager.isDeviceOwnerApp(context.packageName),
            enrolledAt = prefs.getLong(KEY_ENROLLED_AT, 0L).takeIf { it > 0 },
            lastVerifiedAt = prefs.getLong(KEY_LAST_VERIFIED_AT, 0L).takeIf { it > 0 },
            loginState = loginState,
            policies = loadPolicies(),
            monitoredApps = loadMonitoredApps()
        )
    }

    fun enrollDeviceOwner(adminName: String, passphrase: String): DeviceOwnerState {
        val salt = UUID.randomUUID().toString()
        val now = System.currentTimeMillis()
        prefs.edit {
            putBoolean(KEY_IS_OWNER, true)
            putString(KEY_ADMIN_NAME, adminName)
            putString(KEY_SALT, salt)
            putString(KEY_PASS_HASH, hash(passphrase, salt))
            putLong(KEY_ENROLLED_AT, now)
            putBoolean(KEY_LOCKED, false)
            putInt(KEY_FAILURE_COUNT, 0)
            putLong(KEY_LAST_VERIFIED_AT, now)
            putStringSet(KEY_FACTORS, setOf(TokenType.TOTP.name, TokenType.NFC.name))
        }
        ensurePolicyDefaults(now)
        promoteToDeviceOwner()
        return currentState()
    }

    fun verifyAdmin(passphrase: String): Boolean {
        val salt = prefs.getString(KEY_SALT, null) ?: return false
        val storedHash = prefs.getString(KEY_PASS_HASH, null) ?: return false
        val computed = hash(passphrase, salt)
        val now = System.currentTimeMillis()
        val success = storedHash == computed
        prefs.edit {
            if (success) {
                putBoolean(KEY_LOCKED, false)
                putInt(KEY_FAILURE_COUNT, 0)
                putLong(KEY_LAST_VERIFIED_AT, now)
                putLong(KEY_LAST_SUCCESS_AT, now)
            } else {
                val failures = prefs.getInt(KEY_FAILURE_COUNT, 0) + 1
                putInt(KEY_FAILURE_COUNT, failures)
                putLong(KEY_LAST_FAILURE_AT, now)
                if (failures >= MAX_FAILURES) {
                    putBoolean(KEY_LOCKED, true)
                }
            }
        }
        return success
    }

    fun togglePolicy(policyId: String, enforced: Boolean): DeviceOwnerState {
        val now = System.currentTimeMillis()
        prefs.edit {
            putBoolean(policyKey(policyId), enforced)
            putLong(policyChangedKey(policyId), now)
        }
        if (enforced) {
            when (policyId) {
                "vpn_required" -> enforceAlwaysOnVpn()
                "block_unknown_sources" -> blockUnknownSources()
                "screen_lock" -> hardenScreenLock()
            }
        }
        return currentState()
    }

    fun refreshMonitoredApps(): DeviceOwnerState {
        val now = System.currentTimeMillis()
        val applications = packageManager.getInstalledApplications(PackageManager.GET_META_DATA)
        prefs.edit {
            putInt(KEY_TOTAL_APPS, applications.size)
            applications.forEach { info ->
                if (!prefs.contains(appEventKey(info.packageName))) {
                    putLong(appEventKey(info.packageName), now)
                    putString(appNoteKey(info.packageName), "Baseline inventory")
                }
            }
        }
        return currentState()
    }

    fun quarantineApp(packageName: String, reason: String): DeviceOwnerState {
        val blocked = prefs.getStringSet(KEY_BLOCKED_APPS, emptySet())?.toMutableSet() ?: mutableSetOf()
        blocked += packageName
        prefs.edit {
            putStringSet(KEY_BLOCKED_APPS, blocked)
            putLong(appEventKey(packageName), System.currentTimeMillis())
            putString(appNoteKey(packageName), reason)
        }
        return currentState()
    }

    fun releaseApp(packageName: String): DeviceOwnerState {
        val blocked = prefs.getStringSet(KEY_BLOCKED_APPS, emptySet())?.toMutableSet() ?: mutableSetOf()
        val warned = prefs.getStringSet(KEY_WARNED_APPS, emptySet())?.toMutableSet() ?: mutableSetOf()
        blocked.remove(packageName)
        warned.remove(packageName)
        prefs.edit {
            putStringSet(KEY_BLOCKED_APPS, blocked)
            putStringSet(KEY_WARNED_APPS, warned)
            putLong(appEventKey(packageName), System.currentTimeMillis())
            putString(appNoteKey(packageName), "Released by admin")
        }
        return currentState()
    }

    private fun promoteToDeviceOwner() {
        runCatching {
            if (!devicePolicyManager.isDeviceOwnerApp(context.packageName) && Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                devicePolicyManager.setProfileOwner(adminComponent, context.packageName)
            }
        }
    }

    private fun enforceAlwaysOnVpn() {
        runCatching {
            devicePolicyManager.setAlwaysOnVpnPackage(adminComponent, "com.altproductionlabs.vpn", true)
        }
    }

    private fun blockUnknownSources() {
        runCatching {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                devicePolicyManager.setSecureSetting(adminComponent, android.provider.Settings.Global.DEVELOPMENT_SETTINGS_ENABLED, "0")
            }
        }
    }

    private fun hardenScreenLock() {
        runCatching {
            devicePolicyManager.setMaximumTimeToLock(adminComponent, 60_000L)
            devicePolicyManager.setPasswordQuality(adminComponent, DevicePolicyManager.PASSWORD_QUALITY_ALPHANUMERIC)
        }
    }

    private fun loadPolicies(): List<AdminPolicy> {
        return defaultPolicies.map { template ->
            val enforced = prefs.getBoolean(policyKey(template.id), template.enforced)
            val lastUpdated = prefs.getLong(policyChangedKey(template.id), template.lastUpdated)
            val violations = prefs.getInt(policyViolationKey(template.id), template.violations)
            template.copy(enforced = enforced, lastUpdated = lastUpdated, violations = violations)
        }
    }

    private fun loadMonitoredApps(): List<MonitoredApp> {
        val blocked = prefs.getStringSet(KEY_BLOCKED_APPS, emptySet()) ?: emptySet()
        val warned = prefs.getStringSet(KEY_WARNED_APPS, emptySet()) ?: emptySet()
        val apps = runCatching { packageManager.getInstalledApplications(0) }.getOrElse { emptyList<ApplicationInfo>() }
        return apps.map { info ->
            val label = packageManager.getApplicationLabel(info).toString()
            val status = when {
                blocked.contains(info.packageName) -> PolicyStatus.BLOCKED
                warned.contains(info.packageName) -> PolicyStatus.WARNING
                else -> PolicyStatus.COMPLIANT
            }
            val lastEvent = prefs.getLong(appEventKey(info.packageName), 0L).takeIf { it > 0 } ?: System.currentTimeMillis()
            val notes = prefs.getString(appNoteKey(info.packageName), if (status == PolicyStatus.COMPLIANT) "Compliant" else "Pending review") ?: ""
            MonitoredApp(
                packageName = info.packageName,
                label = label,
                status = status,
                lastEventAt = lastEvent,
                notes = notes
            )
        }.sortedWith(compareBy({ it.status.ordinal }, { -it.lastEventAt }))
    }

    private fun readLoginState(): AdminLoginState {
        val requiredFactors = prefs.getStringSet(KEY_FACTORS, setOf(TokenType.TOTP.name))
            ?.mapNotNull { runCatching { TokenType.valueOf(it) }.getOrNull() }
            ?: listOf(TokenType.TOTP)
        return AdminLoginState(
            locked = prefs.getBoolean(KEY_LOCKED, false),
            failureCount = prefs.getInt(KEY_FAILURE_COUNT, 0),
            lastFailureAt = prefs.getLong(KEY_LAST_FAILURE_AT, 0L).takeIf { it > 0 },
            lastSuccessAt = prefs.getLong(KEY_LAST_SUCCESS_AT, 0L).takeIf { it > 0 },
            requiredFactors = requiredFactors
        )
    }

    private fun ensurePolicyDefaults(timestamp: Long) {
        prefs.edit {
            defaultPolicies.forEach { policy ->
                if (!prefs.contains(policyKey(policy.id))) {
                    putBoolean(policyKey(policy.id), policy.enforced)
                    putLong(policyChangedKey(policy.id), timestamp)
                    putInt(policyViolationKey(policy.id), 0)
                }
            }
            if (!prefs.contains(KEY_FACTORS)) {
                putStringSet(KEY_FACTORS, setOf(TokenType.TOTP.name))
            }
        }
    }

    private fun hash(value: String, salt: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val bytes = digest.digest("$value$salt".toByteArray())
        return bytes.joinToString("") { String.format("%02x", it) }
    }

    private fun policyKey(id: String) = "policy_${id}_enforced"
    private fun policyChangedKey(id: String) = "policy_${id}_changed"
    private fun policyViolationKey(id: String) = "policy_${id}_violations"
    private fun appEventKey(pkg: String) = "app_${pkg}_event"
    private fun appNoteKey(pkg: String) = "app_${pkg}_note"

    companion object {
        private const val KEY_IS_OWNER = "is_device_owner"
        private const val KEY_ADMIN_NAME = "admin_name"
        private const val KEY_SALT = "salt"
        private const val KEY_PASS_HASH = "pass_hash"
        private const val KEY_ENROLLED_AT = "enrolled_at"
        private const val KEY_LAST_VERIFIED_AT = "last_verified_at"
        private const val KEY_FAILURE_COUNT = "failure_count"
        private const val KEY_LAST_FAILURE_AT = "last_failure_at"
        private const val KEY_LAST_SUCCESS_AT = "last_success_at"
        private const val KEY_LOCKED = "locked"
        private const val KEY_FACTORS = "required_factors"
        private const val KEY_BLOCKED_APPS = "blocked_apps"
        private const val KEY_WARNED_APPS = "warned_apps"
        private const val KEY_TOTAL_APPS = "total_apps"
        private const val MAX_FAILURES = 5
    }
}

class SentinelDeviceAdminReceiver : DeviceAdminReceiver() {
    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
        Toast.makeText(context, "Sentinel device admin enabled", Toast.LENGTH_SHORT).show()
    }

    override fun onDisabled(context: Context, intent: Intent) {
        super.onDisabled(context, intent)
        Toast.makeText(context, "Sentinel device admin disabled", Toast.LENGTH_SHORT).show()
    }
}
