package com.altproductionlabs.sentinellite.core

import android.net.NetworkCapabilities
import androidx.annotation.ColorInt
import androidx.annotation.DrawableRes
import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Shared data models that describe the state of the local Sentinel instance. These models are
 * intentionally verbose so the future cluster integrations can reuse the same contracts.
 */

data class AppPermissionRisk(
    val packageName: String,
    val label: String,
    val requestedPermissions: List<String>,
    val lastUpdateTime: Long,
    val isSystemApp: Boolean,
    val hasSmsAccess: Boolean,
    val hasContactsAccess: Boolean,
    val isDebuggable: Boolean,
    val source: String
)

data class DeviceIntegrityStatus(
    val debuggableApps: List<AppPermissionRisk>,
    val isDeviceDebuggable: Boolean,
    val isBootloaderUnlocked: Boolean,
    val appearsRooted: Boolean,
    val evidence: List<String>
)

data class MonitoringSnapshot(
    val collectedAt: Long,
    val newInstalls: List<AppPermissionRisk>,
    val riskyPermissions: List<AppPermissionRisk>,
    val integrityStatus: DeviceIntegrityStatus,
    val usageSummary: List<AppUsageStat>
)

data class AppUsageStat(
    val packageName: String,
    val lastUsedAt: Long,
    val totalForegroundMinutes: Long
)

data class NetworkSnapshot(
    val collectedAt: Long,
    val ssid: String?,
    val bssid: String?,
    val security: WifiSecurity,
    val isVpnActive: Boolean,
    val networkType: Int,
    val metered: Boolean,
    val transportFlags: List<Int>,
    val trafficSummary: List<AppTrafficStat>,
    val issues: List<String>
)

enum class WifiSecurity { OPEN, WEP, WPA, WPA2, WPA3, UNKNOWN }

data class AppTrafficStat(
    val uid: Int,
    val packageName: String?,
    val rxBytes: Long,
    val txBytes: Long
)

data class IsolationState(
    val enabled: Boolean,
    val activatedAt: Long?,
    val radiosDisabled: List<String>
)

data class MfaToken(
    val id: String,
    val label: String,
    val type: TokenType,
    val addedAt: Long,
    val lastValidatedAt: Long?
)

enum class TokenType { NFC, USB, BLE, TOTP, OTHER }

data class EvidenceEntry(
    val id: String,
    val createdAt: Long,
    val title: String,
    val description: String,
    val path: String,
    val hash: String
)

data class SentinelAlert(
    val id: String,
    val severity: AlertSeverity,
    val title: String,
    val description: String,
    val source: String,
    val evidenceIds: List<String>,
    val createdAt: Long,
    val acknowledged: Boolean = false
)

enum class AlertSeverity(@ColorInt val accentColor: Int) {
    P1(0xFFFF0051.toInt()),
    P2(0xFFFFA733.toInt()),
    P3(0xFF5AB3FF.toInt())
}

data class RiskScore(
    val score: Int,
    val updatedAt: Long,
    val factors: List<String>
)

data class DashboardState(
    val riskScore: RiskScore,
    val summary: String,
    val latestAlerts: List<SentinelAlert>,
    val monitoringSnapshot: MonitoringSnapshot?,
    val networkSnapshot: NetworkSnapshot?,
    val isolationState: IsolationState,
    val evidenceCount: Int
)

data class SecurityState(
    val isolationState: IsolationState,
    val mfaTokens: List<MfaToken>,
    val evidenceEntries: List<EvidenceEntry>,
    val vaultPath: String,
    val auditLog: List<AuditLogEvent>
)

data class DeviceOwnerState(
    val adminName: String,
    val isDeviceOwner: Boolean,
    val enrolledAt: Long?,
    val lastVerifiedAt: Long?,
    val loginState: AdminLoginState,
    val policies: List<AdminPolicy>,
    val monitoredApps: List<MonitoredApp>
)

data class AdminLoginState(
    val locked: Boolean,
    val failureCount: Int,
    val lastFailureAt: Long?,
    val lastSuccessAt: Long?,
    val requiredFactors: List<TokenType>
)

data class AdminPolicy(
    val id: String,
    val title: String,
    val description: String,
    val enforced: Boolean,
    val lastUpdated: Long,
    val violations: Int
)

enum class PolicyStatus { COMPLIANT, WARNING, BLOCKED }

data class MonitoredApp(
    val packageName: String,
    val label: String,
    val status: PolicyStatus,
    val lastEventAt: Long,
    val notes: String
)

data class AuditLogEvent(
    val id: String,
    val message: String,
    val createdAt: Long
)

@Entity(tableName = "alerts")
data class AlertEntity(
    @PrimaryKey val id: String,
    val severity: String,
    val title: String,
    val description: String,
    val source: String,
    val createdAt: Long,
    val acknowledged: Boolean
)

@Entity(tableName = "risk_scores")
data class RiskScoreEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val score: Int,
    val updatedAt: Long
)

@Entity(tableName = "network_history")
data class NetworkSnapshotEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val collectedAt: Long,
    val ssid: String?,
    val security: String,
    val vpn: Boolean,
    val issues: String
)

@Entity(tableName = "audit_log")
data class AuditLogEntity(
    @PrimaryKey val id: String,
    val message: String,
    val createdAt: Long
)

/** View layer card helper for SecurityFragment */
data class SecurityCard(
    @DrawableRes val icon: Int,
    val title: String,
    val subtitle: String,
    val status: String
)

fun NetworkCapabilities.describeTransports(): List<Int> {
    val transports = mutableListOf<Int>()
    if (hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) transports += NetworkCapabilities.TRANSPORT_WIFI
    if (hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) transports += NetworkCapabilities.TRANSPORT_CELLULAR
    if (hasTransport(NetworkCapabilities.TRANSPORT_VPN)) transports += NetworkCapabilities.TRANSPORT_VPN
    if (hasTransport(NetworkCapabilities.TRANSPORT_BLUETOOTH)) transports += NetworkCapabilities.TRANSPORT_BLUETOOTH
    if (hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) transports += NetworkCapabilities.TRANSPORT_ETHERNET
    return transports
}
