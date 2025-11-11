package com.sentinel.control.ui

import com.sentinel.control.logging.AuditEvent
import com.sentinel.control.network.NetworkStatus
import com.sentinel.control.util.HygieneReport

data class SentinelUiState(
    val lastApprovalStatus: String? = null,
    val lastError: String? = null,
    val registrationStatus: String? = null,
    val lockdownEnabled: Boolean = false,
    val auditEvents: List<AuditEvent> = emptyList(),
    val networkStatus: NetworkStatus = NetworkStatus.Unchecked,
    val hygieneStatus: HygieneReport = HygieneReport(isSecure = true)
)
