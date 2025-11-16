package com.altproductionlabs.sentinellite

import android.app.Application
import androidx.lifecycle.LiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.asLiveData
import androidx.lifecycle.viewModelScope
import com.altproductionlabs.sentinellite.core.DashboardState
import com.altproductionlabs.sentinellite.core.DeviceOwnerState
import com.altproductionlabs.sentinellite.core.SecurityState
import com.altproductionlabs.sentinellite.core.SentinelAlert
import com.altproductionlabs.sentinellite.core.SimulationScenario
import com.altproductionlabs.sentinellite.core.TokenType
import com.altproductionlabs.sentinellite.data.SentinelRepository
import kotlinx.coroutines.launch
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class SentinelViewModel(private val repository: SentinelRepository) : ViewModel() {

    val dashboardState: LiveData<DashboardState> = repository.observeDashboardState().asLiveData()
    val alerts: LiveData<List<SentinelAlert>> = repository.streamActiveAlerts().asLiveData()
    val securityState: LiveData<SecurityState> = repository.observeSecurityState().asLiveData()
    val deviceOwnerState: LiveData<DeviceOwnerState> = repository.observeDeviceOwnerState().asLiveData()

    fun refresh() {
        viewModelScope.launch { repository.refreshNow() }
    }

    fun toggleIsolation(enable: Boolean) = repository.toggleIsolation(enable)

    fun addToken(label: String, type: TokenType) = repository.registerToken(label, type)

    fun captureNetworkEvidence() = repository.captureNetworkEvidence(dashboardState.value?.networkSnapshot)

    fun runSimulation(scenario: SimulationScenario) = repository.runSimulation(scenario)

    fun acknowledgeAlert(id: String) {
        viewModelScope.launch { repository.acknowledgeAlert(id) }
    }

    fun refreshEvidenceVault() = repository.refreshEvidence()

    fun enrollDeviceOwner(adminName: String, passphrase: String) {
        viewModelScope.launch { repository.enrollDeviceOwner(adminName, passphrase) }
    }

    fun verifyAdmin(passphrase: String, onResult: (Boolean) -> Unit) {
        viewModelScope.launch {
            val success = repository.verifyAdmin(passphrase)
            withContext(Dispatchers.Main) { onResult(success) }
        }
    }

    fun updatePolicy(policyId: String, enforced: Boolean) {
        viewModelScope.launch { repository.setPolicyEnforcement(policyId, enforced) }
    }

    fun refreshDeviceOwnerState() {
        viewModelScope.launch { repository.refreshDeviceOwnerState() }
    }

    fun quarantineApp(packageName: String, reason: String) {
        viewModelScope.launch { repository.quarantineApp(packageName, reason) }
    }

    fun releaseApp(packageName: String) {
        viewModelScope.launch { repository.releaseApp(packageName) }
    }
}

class SentinelViewModelFactory(private val context: Application) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        val repo = SentinelRepository.get(context)
        return SentinelViewModel(repo) as T
    }
}
