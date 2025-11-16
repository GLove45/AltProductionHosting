package com.altproductionlabs.sentinellite

import android.app.Application
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import com.altproductionlabs.sentinellite.core.SentinelAlert

class DashboardFragment : Fragment(R.layout.fragment_dashboard) {

    private val viewModel: SentinelViewModel by activityViewModels {
        SentinelViewModelFactory(requireActivity().application as Application)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val riskScore = view.findViewById<TextView>(R.id.risk_score_value)
        val riskFactors = view.findViewById<TextView>(R.id.risk_factors)
        val summary = view.findViewById<TextView>(R.id.summary_stats)
        val monitoringSummary = view.findViewById<TextView>(R.id.monitoring_summary)
        val integrityStatus = view.findViewById<TextView>(R.id.integrity_status)
        val networkSsid = view.findViewById<TextView>(R.id.network_ssid)
        val networkSecurity = view.findViewById<TextView>(R.id.network_security)
        val networkVpn = view.findViewById<TextView>(R.id.network_vpn)
        val networkIssues = view.findViewById<TextView>(R.id.network_issues)
        val alertsContainer = view.findViewById<LinearLayout>(R.id.alerts_container)
        val refreshButton = view.findViewById<Button>(R.id.refresh_button)
        val captureEvidenceButton = view.findViewById<Button>(R.id.capture_evidence_btn)

        refreshButton.setOnClickListener { viewModel.refresh() }
        captureEvidenceButton.setOnClickListener { viewModel.captureNetworkEvidence() }

        viewModel.dashboardState.observe(viewLifecycleOwner) { state ->
            riskScore.text = state.riskScore.score.toString()
            riskFactors.text = "Factors: ${state.riskScore.factors.joinToString().ifBlank { "None" }}"
            summary.text = state.summary
            monitoringSummary.text = buildMonitoringSummary(state)
            integrityStatus.text = buildIntegritySummary(state)

            val network = state.networkSnapshot
            networkSsid.text = "Wi-Fi: ${network?.ssid ?: "Not connected"}"
            networkSecurity.text = "Security: ${network?.security ?: "--"}"
            networkVpn.text = "VPN: ${if (network?.isVpnActive == true) "Active" else "Not detected"}"
            networkIssues.text = if (network?.issues?.isNotEmpty() == true) {
                "Issues: ${network.issues.joinToString()}"
            } else {
                "Issues: None"
            }
        }

        viewModel.alerts.observe(viewLifecycleOwner) { alerts ->
            alertsContainer.removeAllViews()
            alerts.take(4).forEach { alert ->
                alertsContainer.addView(createAlertView(alertsContainer, alert))
            }
        }
    }

    private fun buildMonitoringSummary(state: com.altproductionlabs.sentinellite.core.DashboardState): String {
        val snapshot = state.monitoringSnapshot ?: return "Waiting for monitoring engine…"
        val newApps = snapshot.newInstalls.size
        val risky = snapshot.riskyPermissions.size
        return "$newApps new installs • $risky permission risks"
    }

    private fun buildIntegritySummary(state: com.altproductionlabs.sentinellite.core.DashboardState): String {
        val integrity = state.monitoringSnapshot?.integrityStatus ?: return "Integrity: not available"
        val rooted = if (integrity.appearsRooted) "Rooted" else "Clean"
        val boot = if (integrity.isBootloaderUnlocked) "OEM unlock" else "Bootloader locked"
        return "Integrity: $rooted • $boot"
    }

    private fun createAlertView(container: LinearLayout, alert: SentinelAlert): View {
        val card = layoutInflater.inflate(R.layout.view_alert_card, container, false)
        card.findViewById<TextView>(R.id.alert_title).apply {
            text = alert.title
            setTextColor(alert.severity.accentColor)
        }
        card.findViewById<TextView>(R.id.alert_meta).text =
            "${alert.severity} • ${alert.source} • ${formatAge(alert.createdAt)}"
        card.findViewById<View>(R.id.alert_ack_button).visibility = View.GONE
        return card
    }

    private fun formatAge(timestamp: Long): String {
        val delta = System.currentTimeMillis() - timestamp
        val minutes = (delta / 60000).coerceAtLeast(0)
        return if (minutes < 1) "just now" else "$minutes m ago"
    }
}
