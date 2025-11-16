package com.sentinel.control

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import com.sentinel.control.ui.SentinelScreen
import com.sentinel.control.ui.SentinelViewModel

class MainActivity : ComponentActivity() {

    private val viewModel: SentinelViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        viewModel.initialize(this)
        setContent {
            MaterialTheme {
                Surface {
                    val uiState by viewModel.uiState.collectAsState()
                    SentinelScreen(
                        state = uiState,
                        onApprove = { viewModel.onApprove(this) },
                        onRegisterDevice = { viewModel.registerDevice(this) },
                        onRevokeDevice = { viewModel.revokeDevice(this) },
                        onToggleLockdown = { viewModel.toggleLockdown() },
                        onNetworkTest = { viewModel.testNetworkConnectivity(this) },
                        onQuarantine = { viewModel.quarantine(this) },
                        onRefreshSecurity = { viewModel.refreshSecurityPosture(this) },
                        onToggleAlerts = { viewModel.toggleAlerting(this) },
                        onToggleAutoIsolation = { viewModel.toggleIsolationAutomation(this) },
                        onToggleRiskMfa = { viewModel.toggleRiskMfa(this) }
                    )
                }
            }
        }
    }
}
