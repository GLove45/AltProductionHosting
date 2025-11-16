package com.altproductionlabs.sentinellite

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.asLiveData
import androidx.lifecycle.viewModelScope
import com.altproductionlabs.sentinellite.core.DashboardState
import com.altproductionlabs.sentinellite.core.SecurityState
import com.altproductionlabs.sentinellite.core.SentinelAlert
import com.altproductionlabs.sentinellite.core.SimulationScenario
import com.altproductionlabs.sentinellite.core.TokenType
import com.altproductionlabs.sentinellite.data.SentinelRepository
import kotlinx.coroutines.launch

class SentinelViewModel(private val repository: SentinelRepository) : ViewModel() {

    val dashboardState: LiveData<DashboardState> = repository.observeDashboardState().asLiveData()
    val alerts: LiveData<List<SentinelAlert>> = repository.streamActiveAlerts().asLiveData()
    val securityState: LiveData<SecurityState> = repository.observeSecurityState().asLiveData()

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
}

class SentinelViewModelFactory(private val context: Application) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        val repo = SentinelRepository.get(context)
        return SentinelViewModel(repo) as T
    }
}
