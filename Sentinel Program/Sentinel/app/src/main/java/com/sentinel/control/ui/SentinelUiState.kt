package com.sentinel.control.ui

import com.sentinel.control.data.AlertSettings
import com.sentinel.control.logging.AuditEvent
import com.sentinel.control.network.NetworkStatus
import com.sentinel.control.security.intel.AlertStoryboardEntry
import com.sentinel.control.security.intel.NetworkIntelligenceReport
import com.sentinel.control.security.intel.SecurityScore
import com.sentinel.control.security.intel.ThreatSurfaceReport
import com.sentinel.control.security.intel.ZeroTrustIntegrityReport
import com.sentinel.control.util.HygieneReport

data class SentinelUiState(
    val lastApprovalStatus: String? = null,
    val lastError: String? = null,
    val registrationStatus: String? = null,
    val lockdownEnabled: Boolean = false,
    val auditEvents: List<AuditEvent> = emptyList(),
    val networkStatus: NetworkStatus = NetworkStatus.Unchecked,
    val hygieneStatus: HygieneReport = HygieneReport(isSecure = true),
    val securityScore: SecurityScore? = null,
    val alertStoryboard: List<AlertStoryboardEntry> = emptyList(),
    val threatSurface: ThreatSurfaceReport? = null,
    val integrityReport: ZeroTrustIntegrityReport? = null,
    val networkIntel: NetworkIntelligenceReport? = null,
    val alertSettings: AlertSettings = AlertSettings()
)
