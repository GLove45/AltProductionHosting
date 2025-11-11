package com.sentinel.control.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Error
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.Divider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.sentinel.control.logging.AuditEvent
import com.sentinel.control.network.NetworkStatus
import com.sentinel.control.util.HygieneReport

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SentinelScreen(
    state: SentinelUiState,
    onApprove: () -> Unit,
    onRegisterDevice: () -> Unit,
    onRevokeDevice: () -> Unit,
    onToggleLockdown: () -> Unit,
    onNetworkTest: () -> Unit,
    onQuarantine: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        HeaderSection(state)
        ActionButtons(onApprove, onRegisterDevice, onRevokeDevice, onQuarantine)
        LockdownToggle(state.lockdownEnabled, onToggleLockdown)
        NetworkCard(state.networkStatus, onNetworkTest)
        HygieneCard(state.hygieneStatus)
        AuditLogList(state.auditEvents)
        ErrorBanner(state.lastError)
        StatusBanner(state.lastApprovalStatus ?: state.registrationStatus)
    }
}

@Composable
private fun HeaderSection(state: SentinelUiState) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text("Sentinel Control", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Text(
            text = if (state.lockdownEnabled) "System in lockdown" else "System ready",
            style = MaterialTheme.typography.bodyMedium,
            color = if (state.lockdownEnabled) Color.Red else MaterialTheme.colorScheme.primary
        )
    }
}

@Composable
private fun ActionButtons(
    onApprove: () -> Unit,
    onRegisterDevice: () -> Unit,
    onRevokeDevice: () -> Unit,
    onQuarantine: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Button(onClick = onApprove, modifier = Modifier.weight(1f)) { Text("Approve") }
        Button(onClick = onRegisterDevice, modifier = Modifier.weight(1f)) { Text("Register") }
        Button(onClick = onRevokeDevice, modifier = Modifier.weight(1f)) { Text("Revoke") }
        Button(onClick = onQuarantine, modifier = Modifier.weight(1f)) { Text("Quarantine") }
    }
}

@Composable
private fun LockdownToggle(enabled: Boolean, onToggle: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text("Lockdown", style = MaterialTheme.typography.titleLarge)
            Switch(checked = enabled, onCheckedChange = { onToggle() })
        }
    }
}

@Composable
private fun NetworkCard(status: NetworkStatus, onNetworkTest: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Network Health", style = MaterialTheme.typography.titleLarge)
            Text(text = status.describe(), style = MaterialTheme.typography.bodyMedium)
            Button(onClick = onNetworkTest) { Text("Run Test") }
        }
    }
}

@Composable
private fun HygieneCard(report: HygieneReport) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Threat Hygiene", style = MaterialTheme.typography.titleLarge)
            Text(
                text = report.messages.joinToString().ifEmpty { "All hygiene checks passed" },
                color = if (report.isSecure) MaterialTheme.colorScheme.onSurface else Color.Red
            )
        }
    }
}

@Composable
private fun AuditLogList(events: List<AuditEvent>) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("Recent Activity", style = MaterialTheme.typography.titleLarge)
            Divider(modifier = Modifier.padding(vertical = 8.dp))
            LazyColumn(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                items(events) { event ->
                    Column(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(event.type)
                            Text(event.timestamp)
                        }
                        Text(event.message, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }
    }
}

@Composable
private fun ErrorBanner(message: String?) {
    if (message != null) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            containerColor = Color(0x44FF5555)
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(Icons.Default.Error, contentDescription = "Error", tint = Color.Red)
                Text(text = message, color = Color.Red)
            }
        }
    }
}

@Composable
private fun StatusBanner(message: String?) {
    if (message != null) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            containerColor = Color(0x4400FF00)
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(Icons.Default.CheckCircle, contentDescription = "Status", tint = Color.Green)
                Text(text = message, color = Color.Green)
            }
        }
    }
}
