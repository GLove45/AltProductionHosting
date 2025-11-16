package com.altproductionlabs.sentinellite.engine

import com.altproductionlabs.sentinellite.core.AlertSeverity
import com.altproductionlabs.sentinellite.core.IsolationState
import com.altproductionlabs.sentinellite.core.MonitoringSnapshot
import com.altproductionlabs.sentinellite.core.NetworkSnapshot
import com.altproductionlabs.sentinellite.core.RiskScore
import com.altproductionlabs.sentinellite.core.SentinelAlert
import java.util.UUID
import kotlin.math.max

class RulesEngine {

    fun evaluate(
        monitoringSnapshot: MonitoringSnapshot?,
        networkSnapshot: NetworkSnapshot?,
        isolationState: IsolationState,
        vpnRequired: Boolean
    ): Pair<List<SentinelAlert>, RiskScore> {
        val alerts = mutableListOf<SentinelAlert>()
        val factors = mutableListOf<String>()

        monitoringSnapshot?.let { snapshot ->
            snapshot.newInstalls.filter { it.hasSmsAccess || it.hasContactsAccess }.forEach { app ->
                alerts += SentinelAlert(
                    id = UUID.randomUUID().toString(),
                    severity = AlertSeverity.P2,
                    title = "New app with sensitive permissions",
                    description = "${app.label} (${app.packageName}) installed recently with SMS/Contacts access",
                    source = "MonitoringEngine",
                    evidenceIds = emptyList(),
                    createdAt = snapshot.collectedAt
                )
                factors += "suspicious_app"
            }
            if (snapshot.integrityStatus.appearsRooted) {
                alerts += SentinelAlert(
                    id = UUID.randomUUID().toString(),
                    severity = AlertSeverity.P1,
                    title = "Device appears rooted",
                    description = snapshot.integrityStatus.evidence.joinToString(),
                    source = "Integrity",
                    evidenceIds = emptyList(),
                    createdAt = snapshot.collectedAt
                )
                factors += "rooted"
            }
        }

        networkSnapshot?.let { snapshot ->
            if (snapshot.security == com.altproductionlabs.sentinellite.core.WifiSecurity.OPEN && vpnRequired && !snapshot.isVpnActive) {
                alerts += SentinelAlert(
                    id = UUID.randomUUID().toString(),
                    severity = AlertSeverity.P1,
                    title = "Open Wi-Fi without VPN",
                    description = "Connected to ${snapshot.ssid ?: "unknown"} without VPN",
                    source = "Network",
                    evidenceIds = emptyList(),
                    createdAt = snapshot.collectedAt
                )
                factors += "open_wifi"
            }
            if (snapshot.issues.isNotEmpty()) {
                alerts += SentinelAlert(
                    id = UUID.randomUUID().toString(),
                    severity = AlertSeverity.P3,
                    title = "Network posture issues",
                    description = snapshot.issues.joinToString(),
                    source = "Network",
                    evidenceIds = emptyList(),
                    createdAt = snapshot.collectedAt
                )
                factors += "network_issues"
            }
        }

        if (isolationState.enabled) {
            alerts += SentinelAlert(
                id = UUID.randomUUID().toString(),
                severity = AlertSeverity.P2,
                title = "Isolation mode active",
                description = "Radios disabled: ${isolationState.radiosDisabled.joinToString()}",
                source = "SecurityTools",
                evidenceIds = emptyList(),
                createdAt = isolationState.activatedAt ?: System.currentTimeMillis()
            )
            factors += "isolation"
        }

        val score = computeRiskScore(alerts)
        val riskScore = RiskScore(score, System.currentTimeMillis(), factors.distinct())
        return alerts to riskScore
    }

    private fun computeRiskScore(alerts: List<SentinelAlert>): Int {
        var score = 0
        alerts.forEach { alert ->
            score += when (alert.severity) {
                AlertSeverity.P1 -> 40
                AlertSeverity.P2 -> 25
                AlertSeverity.P3 -> 10
            }
        }
        return max(0, score.coerceAtMost(100))
    }
}
