package com.sentinel.control.ui

import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sentinel.control.data.AlertSettingsStore
import com.sentinel.control.data.ApprovalTokenStore
import com.sentinel.control.data.DeviceRegistrationManager
import com.sentinel.control.logging.AuditLog
import com.sentinel.control.logging.SentinelLogger
import com.sentinel.control.logging.SecurityAlertNotifier
import com.sentinel.control.mfa.MfaPolicyEngine
import com.sentinel.control.network.NetworkDiagnostics
import com.sentinel.control.network.SentinelApi
import com.sentinel.control.security.DeviceKeyManager
import com.sentinel.control.security.intel.ActiveDefenseController
import com.sentinel.control.security.intel.SecurityIntelligenceCoordinator
import com.sentinel.control.telemetry.BehavioralTelemetry
import com.sentinel.control.util.ThreatHygieneChecker
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class SentinelViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(SentinelUiState())
    val uiState: StateFlow<SentinelUiState> = _uiState

    private val logger = SentinelLogger
    private val mfaPolicyEngine = MfaPolicyEngine()
    private val hygieneChecker = ThreatHygieneChecker()
    private var initialized = false

    fun initialize(activity: FragmentActivity) {
        if (initialized) return
        initialized = true
        viewModelScope.launch {
            val store = AlertSettingsStore(activity)
            val settings = store.load()
            _uiState.value = _uiState.value.copy(
                alertSettings = settings,
                auditEvents = AuditLog.readEntries(activity)
            )
            refreshSecurityPosture(activity)
        }
    }

    fun refreshSecurityPosture(activity: FragmentActivity) {
        viewModelScope.launch {
            val coordinator = SecurityIntelligenceCoordinator(activity)
            val report = coordinator.collect()
            val settings = _uiState.value.alertSettings
            _uiState.value = _uiState.value.copy(
                securityScore = report.score,
                alertStoryboard = report.storyboard,
                hygieneStatus = report.hygieneReport,
                threatSurface = report.threatSurface,
                integrityReport = report.integrity,
                networkIntel = report.network,
                lastError = null
            )
            if (settings.isolationOnThreat && report.score.overall < 55) {
                ActiveDefenseController(activity).enterIsolation()
            }
            if (settings.requireMfaOnThreat && report.score.overall < 65) {
                mfaPolicyEngine.enforcePinRequirement(activity, true)
            }
            SecurityAlertNotifier.publish(activity, report, settings)
        }
    }

    fun onApprove(activity: FragmentActivity) {
        viewModelScope.launch {
            val hygieneReport = hygieneChecker.evaluate(activity)
            if (!hygieneReport.isSecure) {
                logger.warn("Hygiene check failed: ${'$'}{hygieneReport.messages}")
                _uiState.value = _uiState.value.copy(
                    lastError = "Device hygiene requirements not met",
                    hygieneStatus = hygieneReport
                )
                return@launch
            }

            val requiredFactors = when {
                _uiState.value.alertSettings.requireMfaOnThreat && (_uiState.value.securityScore?.overall
                    ?: 100) < 70 -> 3
                else -> 1
            }
            val policyResult = mfaPolicyEngine.collect(activity, requiredFactors)
            if (!policyResult.isSuccessful) {
                logger.warn("MFA policy failed: ${'$'}{policyResult.reason}")
                _uiState.value = _uiState.value.copy(lastError = policyResult.reason)
                return@launch
            }

            val deviceKeyManager = DeviceKeyManager(activity)
            val api = SentinelApi(activity)

            try {
                val challenge = api.fetchChallenge(deviceKeyManager.getKeyId())
                val signature = deviceKeyManager.signNonce(challenge.nonce, activity)
                val approvalResponse = api.approveNonce(signature, policyResult)
                ApprovalTokenStore(activity).saveToken(approvalResponse)
                AuditLog.recordApproval(challenge, approvalResponse, activity)
                BehavioralTelemetry.trackApproval()

                _uiState.value = _uiState.value.copy(
                    lastApprovalStatus = "Approved at ${'$'}{approvalResponse.timestamp}",
                    lastError = null,
                    auditEvents = AuditLog.readEntries(activity)
                )
            } catch (ex: Exception) {
                logger.error("Approval flow failed", ex)
                _uiState.value = _uiState.value.copy(lastError = ex.message)
            }
        }
    }

    fun registerDevice(activity: FragmentActivity) {
        viewModelScope.launch {
            val manager = DeviceRegistrationManager(activity)
            val result = manager.register()
            if (result.error == null) {
                AuditLog.recordEvent(activity, "REGISTER", result.message ?: "registered")
            }
            _uiState.value = _uiState.value.copy(
                registrationStatus = result.message,
                lastError = result.error,
                auditEvents = AuditLog.readEntries(activity)
            )
        }
    }

    fun revokeDevice(activity: FragmentActivity) {
        viewModelScope.launch {
            val manager = DeviceRegistrationManager(activity)
            val result = manager.revoke()
            if (result.error == null) {
                AuditLog.recordEvent(activity, "REVOKE", result.message ?: "revoked")
            }
            _uiState.value = _uiState.value.copy(
                registrationStatus = result.message,
                lastError = result.error,
                auditEvents = AuditLog.readEntries(activity)
            )
        }
    }

    fun toggleLockdown() {
        val newMode = !_uiState.value.lockdownEnabled
        _uiState.value = _uiState.value.copy(lockdownEnabled = newMode)
        BehavioralTelemetry.trackLockdown(newMode)
    }

    fun quarantine(activity: FragmentActivity) {
        viewModelScope.launch {
            val api = SentinelApi(activity)
            val response = api.triggerQuarantine()
            AuditLog.recordEvent(activity, "QUARANTINE", response.message ?: "Triggered")
            _uiState.value = _uiState.value.copy(
                lastApprovalStatus = response.message,
                lastError = response.error,
                auditEvents = AuditLog.readEntries(activity)
            )
            refreshSecurityPosture(activity)
        }
    }

    fun testNetworkConnectivity(activity: FragmentActivity) {
        viewModelScope.launch {
            val diagnostics = NetworkDiagnostics(activity)
            val result = diagnostics.check()
            _uiState.value = _uiState.value.copy(networkStatus = result)
        }
    }

    fun toggleAlerting(activity: FragmentActivity) {
        viewModelScope.launch {
            val store = AlertSettingsStore(activity)
            val updated = store.update { it.copy(pushEnabled = !it.pushEnabled) }
            _uiState.value = _uiState.value.copy(alertSettings = updated)
        }
    }

    fun toggleIsolationAutomation(activity: FragmentActivity) {
        viewModelScope.launch {
            val store = AlertSettingsStore(activity)
            val updated = store.update { it.copy(isolationOnThreat = !it.isolationOnThreat) }
            _uiState.value = _uiState.value.copy(alertSettings = updated)
        }
    }

    fun toggleRiskMfa(activity: FragmentActivity) {
        viewModelScope.launch {
            val store = AlertSettingsStore(activity)
            val updated = store.update { it.copy(requireMfaOnThreat = !it.requireMfaOnThreat) }
            if (!updated.requireMfaOnThreat) {
                mfaPolicyEngine.enforcePinRequirement(activity, false)
            }
            _uiState.value = _uiState.value.copy(alertSettings = updated)
        }
    }
}
