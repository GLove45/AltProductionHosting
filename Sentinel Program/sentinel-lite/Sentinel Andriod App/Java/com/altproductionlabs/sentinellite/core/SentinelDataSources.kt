package com.altproductionlabs.sentinellite.core

import kotlinx.coroutines.flow.Flow

interface SignalSource<T> {
    suspend fun collect(): T
}

interface SentinelAlertsDataSource {
    fun streamActiveAlerts(): Flow<List<SentinelAlert>>
    suspend fun acknowledgeAlert(id: String)
}

interface SentinelStatusDataSource {
    fun observeDashboardState(): Flow<DashboardState>
    suspend fun refreshNow()
}

interface SentinelPolicyDataSource {
    fun observeSecurityState(): Flow<SecurityState>
}

sealed class SimulationScenario(val id: String, val label: String, val description: String) {
    object OpenWifiNoVpn : SimulationScenario(
        id = "open_wifi",
        label = "Join open Wi-Fi w/out VPN",
        description = "Simulates connecting to an open network while VPN-required policy is active"
    )

    object MaliciousAppInstall : SimulationScenario(
        id = "malicious_app",
        label = "Install malicious app",
        description = "Pretends that a sideloaded spyware app was added moments ago"
    )

    object RootAttempt : SimulationScenario(
        id = "root_attempt",
        label = "Root attempt",
        description = "Marks the device as rooted and injects tamper evidence"
    )

    companion object {
        val all: List<SimulationScenario> = listOf(OpenWifiNoVpn, MaliciousAppInstall, RootAttempt)
    }
}
