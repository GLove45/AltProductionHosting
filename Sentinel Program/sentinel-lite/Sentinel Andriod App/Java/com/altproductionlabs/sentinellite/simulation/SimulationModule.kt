package com.altproductionlabs.sentinellite.simulation

import com.altproductionlabs.sentinellite.core.AppPermissionRisk
import com.altproductionlabs.sentinellite.core.DeviceIntegrityStatus
import com.altproductionlabs.sentinellite.core.MonitoringSnapshot
import com.altproductionlabs.sentinellite.core.NetworkSnapshot
import com.altproductionlabs.sentinellite.core.SignalSource
import com.altproductionlabs.sentinellite.core.SimulationScenario
import com.altproductionlabs.sentinellite.core.WifiSecurity
import java.util.concurrent.TimeUnit

class SimulationModule : SignalSource<Pair<MonitoringSnapshot?, NetworkSnapshot?>> {

    private var scenario: SimulationScenario? = null

    fun selectScenario(scenario: SimulationScenario) {
        this.scenario = scenario
    }

    override suspend fun collect(): Pair<MonitoringSnapshot?, NetworkSnapshot?> {
        val now = System.currentTimeMillis()
        return when (scenario) {
            SimulationScenario.OpenWifiNoVpn -> null to NetworkSnapshot(
                collectedAt = now,
                ssid = "Mall_Free_WiFi",
                bssid = "00:11:22:33:44:55",
                security = WifiSecurity.OPEN,
                isVpnActive = false,
                networkType = 0,
                metered = false,
                transportFlags = listOf(),
                trafficSummary = emptyList(),
                issues = listOf("Connected to open network", "VPN disabled")
            )

            SimulationScenario.MaliciousAppInstall -> MonitoringSnapshot(
                collectedAt = now,
                newInstalls = listOf(
                    AppPermissionRisk(
                        packageName = "com.spyware.bad",
                        label = "SpyNote",
                        requestedPermissions = listOf("android.permission.READ_SMS", "android.permission.READ_CONTACTS"),
                        lastUpdateTime = now - TimeUnit.MINUTES.toMillis(1),
                        isSystemApp = false,
                        hasSmsAccess = true,
                        hasContactsAccess = true,
                        isDebuggable = false,
                        source = "Simulation"
                    )
                ),
                riskyPermissions = emptyList(),
                integrityStatus = DeviceIntegrityStatus(emptyList(), false, false, false, emptyList()),
                usageSummary = emptyList()
            ) to null

            SimulationScenario.RootAttempt -> MonitoringSnapshot(
                collectedAt = now,
                newInstalls = emptyList(),
                riskyPermissions = emptyList(),
                integrityStatus = DeviceIntegrityStatus(
                    debuggableApps = emptyList(),
                    isDeviceDebuggable = true,
                    isBootloaderUnlocked = true,
                    appearsRooted = true,
                    evidence = listOf("su binary detected", "ro.secure=0")
                ),
                usageSummary = emptyList()
            ) to null

            else -> null to null
        }
    }
}
