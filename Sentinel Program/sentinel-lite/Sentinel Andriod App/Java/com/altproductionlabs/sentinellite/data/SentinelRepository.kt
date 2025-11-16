package com.altproductionlabs.sentinellite.data

import android.content.Context
import com.altproductionlabs.sentinellite.core.AlertEntity
import com.altproductionlabs.sentinellite.core.AlertSeverity
import com.altproductionlabs.sentinellite.core.DashboardState
import com.altproductionlabs.sentinellite.core.DeviceOwnerState
import com.altproductionlabs.sentinellite.core.IsolationState
import com.altproductionlabs.sentinellite.core.NetworkSnapshot
import com.altproductionlabs.sentinellite.core.RiskScore
import com.altproductionlabs.sentinellite.core.SecurityState
import com.altproductionlabs.sentinellite.core.SentinelAlert
import com.altproductionlabs.sentinellite.core.SentinelAlertsDataSource
import com.altproductionlabs.sentinellite.core.SentinelPolicyDataSource
import com.altproductionlabs.sentinellite.core.SentinelStatusDataSource
import com.altproductionlabs.sentinellite.core.SimulationScenario
import com.altproductionlabs.sentinellite.engine.LocalMonitoringEngine
import com.altproductionlabs.sentinellite.engine.NetworkIntelligenceModule
import com.altproductionlabs.sentinellite.engine.RulesEngine
import com.altproductionlabs.sentinellite.security.AuditLogger
import com.altproductionlabs.sentinellite.security.DeviceOwnerManager
import com.altproductionlabs.sentinellite.security.EvidenceVault
import com.altproductionlabs.sentinellite.security.IsolationController
import com.altproductionlabs.sentinellite.security.LocalMfaRegistry
import com.altproductionlabs.sentinellite.simulation.SimulationModule
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.UUID

class SentinelRepository private constructor(private val context: Context) :
    SentinelAlertsDataSource,
    SentinelStatusDataSource,
    SentinelPolicyDataSource {

    private val database = SentinelDatabase.create(context)
    private val monitoringEngine = LocalMonitoringEngine(context)
    private val networkModule = NetworkIntelligenceModule(context)
    private val rulesEngine = RulesEngine()
    private val isolationController = IsolationController(context)
    private val mfaRegistry = LocalMfaRegistry(context)
    private val evidenceVault = EvidenceVault(context)
    private val deviceOwnerManager = DeviceOwnerManager(context)
    private val auditLogger = AuditLogger(context)
    private val simulationModule = SimulationModule()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    private val _dashboardState = MutableStateFlow(
        DashboardState(
            riskScore = RiskScore(0, System.currentTimeMillis(), emptyList()),
            summary = "Initializing sensors…",
            latestAlerts = emptyList(),
            monitoringSnapshot = null,
            networkSnapshot = null,
            isolationState = IsolationState(false, null, emptyList()),
            evidenceCount = 0
        )
    )
    private val _securityState = MutableStateFlow(
        SecurityState(
            isolationState = IsolationState(false, null, emptyList()),
            mfaTokens = mfaRegistry.getTokens(),
            evidenceEntries = evidenceVault.listEvidence(),
            vaultPath = evidenceVault.vaultPath(),
            auditLog = auditLogger.read()
        )
    )
    private val _deviceOwnerState = MutableStateFlow(deviceOwnerManager.currentState())

    init {
        scope.launch { refreshNow() }
    }

    override fun observeDashboardState(): kotlinx.coroutines.flow.Flow<DashboardState> = _dashboardState.asStateFlow()

    override suspend fun refreshNow() {
        val monitoring = runCatching { monitoringEngine.collect() }.getOrNull()
        val network = runCatching { networkModule.collect() }.getOrNull()
        val isolation = _securityState.value.isolationState

        val (alerts, riskScore) = rulesEngine.evaluate(monitoring, network, isolation, vpnRequired = true)
        persistAlerts(alerts, network, riskScore)

        _dashboardState.value = DashboardState(
            riskScore = riskScore,
            summary = buildSummary(alerts, network),
            latestAlerts = alerts,
            monitoringSnapshot = monitoring,
            networkSnapshot = network,
            isolationState = isolation,
            evidenceCount = evidenceVault.listEvidence().size
        )
    }

    private suspend fun persistAlerts(alerts: List<SentinelAlert>, network: NetworkSnapshot?, riskScore: RiskScore) {
        database.alerts().upsertAll(alerts.map {
            AlertEntity(
                id = it.id,
                severity = it.severity.name,
                title = it.title,
                description = it.description,
                source = it.source,
                createdAt = it.createdAt,
                acknowledged = it.acknowledged
            )
        })
        database.riskScores().insert(
            com.altproductionlabs.sentinellite.core.RiskScoreEntity(score = riskScore.score, updatedAt = riskScore.updatedAt)
        )
        network?.let {
            database.network().insert(
                com.altproductionlabs.sentinellite.core.NetworkSnapshotEntity(
                    collectedAt = it.collectedAt,
                    ssid = it.ssid,
                    security = it.security.name,
                    vpn = it.isVpnActive,
                    issues = it.issues.joinToString()
                )
            )
        }
    }

    private fun buildSummary(alerts: List<SentinelAlert>, network: NetworkSnapshot?): String {
        val critical = alerts.count { it.severity == AlertSeverity.P1 }
        val nodes = "Local mode"
        val net = network?.ssid ?: "No Wi-Fi"
        return "$nodes • ${alerts.size} alerts • Wi-Fi: $net • P1=$critical"
    }

    override fun streamActiveAlerts(): kotlinx.coroutines.flow.Flow<List<SentinelAlert>> =
        database.alerts().streamAlerts().map { it.map { entity -> entity.toModel() } }

    override suspend fun acknowledgeAlert(id: String) {
        database.alerts().acknowledge(id)
        auditLogger.append("Acknowledged alert $id")
        _securityState.value = _securityState.value.copy(auditLog = auditLogger.read())
    }

    override fun observeSecurityState(): kotlinx.coroutines.flow.Flow<SecurityState> = _securityState.asStateFlow()

    override fun observeDeviceOwnerState(): kotlinx.coroutines.flow.Flow<DeviceOwnerState> = _deviceOwnerState.asStateFlow()

    fun toggleIsolation(enable: Boolean) {
        val state = if (enable) isolationController.enableIsolation() else isolationController.disableIsolation()
        _securityState.value = _securityState.value.copy(isolationState = state)
        scope.launch { refreshNow() }
        auditLogger.append(if (enable) "Isolation enabled" else "Isolation disabled")
        _securityState.value = _securityState.value.copy(auditLog = auditLogger.read())
    }

    fun registerToken(label: String, type: com.altproductionlabs.sentinellite.core.TokenType) {
        val token = com.altproductionlabs.sentinellite.core.MfaToken(
            id = UUID.randomUUID().toString(),
            label = label,
            type = type,
            addedAt = System.currentTimeMillis(),
            lastValidatedAt = null
        )
        mfaRegistry.addToken(token)
        _securityState.value = _securityState.value.copy(
            mfaTokens = mfaRegistry.getTokens(),
            auditLog = auditLogger.read()
        )
        auditLogger.append("Added MFA token ${token.label}")
        _securityState.value = _securityState.value.copy(auditLog = auditLogger.read())
    }

    fun refreshEvidence() {
        _securityState.value = _securityState.value.copy(evidenceEntries = evidenceVault.listEvidence())
    }

    fun captureNetworkEvidence(snapshot: NetworkSnapshot?) {
        snapshot ?: return
        val entry = evidenceVault.captureWifiSnapshot(snapshot.ssid, snapshot.issues)
        val entries = evidenceVault.listEvidence()
        _securityState.value = _securityState.value.copy(evidenceEntries = entries)
        auditLogger.append("Captured Wi-Fi evidence ${entry.title}")
        _securityState.value = _securityState.value.copy(auditLog = auditLogger.read())
    }

    fun runSimulation(scenario: SimulationScenario) {
        simulationModule.selectScenario(scenario)
        scope.launch {
            val (monitoring, network) = simulationModule.collect()
            val isolation = _securityState.value.isolationState
            val (alerts, riskScore) = rulesEngine.evaluate(monitoring, network, isolation, vpnRequired = true)
            _dashboardState.value = _dashboardState.value.copy(
                riskScore = riskScore,
                latestAlerts = alerts,
                summary = "Simulation • ${scenario.label}",
                monitoringSnapshot = monitoring,
                networkSnapshot = network
            )
            persistAlerts(alerts, network, riskScore)
            auditLogger.append("Simulation executed: ${scenario.label}")
            _securityState.value = _securityState.value.copy(auditLog = auditLogger.read())
        }
    }

    suspend fun enrollDeviceOwner(adminName: String, passphrase: String) = withContext(Dispatchers.Default) {
        _deviceOwnerState.value = deviceOwnerManager.enrollDeviceOwner(adminName, passphrase)
        auditLogger.append("Device owner enrollment updated for $adminName")
        _securityState.value = _securityState.value.copy(auditLog = auditLogger.read())
    }

    suspend fun verifyAdmin(passphrase: String): Boolean = withContext(Dispatchers.Default) {
        val success = deviceOwnerManager.verifyAdmin(passphrase)
        _deviceOwnerState.value = deviceOwnerManager.currentState()
        auditLogger.append(if (success) "Admin verification succeeded" else "Admin verification failed")
        _securityState.value = _securityState.value.copy(auditLog = auditLogger.read())
        success
    }

    suspend fun setPolicyEnforcement(policyId: String, enforced: Boolean) = withContext(Dispatchers.Default) {
        _deviceOwnerState.value = deviceOwnerManager.togglePolicy(policyId, enforced)
        auditLogger.append("Policy $policyId ${if (enforced) "enforced" else "relaxed"}")
        _securityState.value = _securityState.value.copy(auditLog = auditLogger.read())
    }

    suspend fun refreshDeviceOwnerState() = withContext(Dispatchers.Default) {
        _deviceOwnerState.value = deviceOwnerManager.refreshMonitoredApps()
    }

    suspend fun quarantineApp(packageName: String, reason: String) = withContext(Dispatchers.Default) {
        _deviceOwnerState.value = deviceOwnerManager.quarantineApp(packageName, reason)
        auditLogger.append("App quarantined: $packageName")
        _securityState.value = _securityState.value.copy(auditLog = auditLogger.read())
    }

    suspend fun releaseApp(packageName: String) = withContext(Dispatchers.Default) {
        _deviceOwnerState.value = deviceOwnerManager.releaseApp(packageName)
        auditLogger.append("App released: $packageName")
        _securityState.value = _securityState.value.copy(auditLog = auditLogger.read())
    }

    companion object {
        @Volatile private var INSTANCE: SentinelRepository? = null

        fun get(context: Context): SentinelRepository = INSTANCE ?: synchronized(this) {
            INSTANCE ?: SentinelRepository(context).also { INSTANCE = it }
        }
    }
}
