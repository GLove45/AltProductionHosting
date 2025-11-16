package com.altproductionlabs.sentinellite

import android.app.Application
import android.app.AlertDialog
import android.os.Bundle
import android.text.InputType
import android.view.View
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.CompoundButton
import android.widget.EditText
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.Spinner
import android.widget.Switch
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import com.altproductionlabs.sentinellite.core.SecurityState
import com.altproductionlabs.sentinellite.core.DeviceOwnerState
import com.altproductionlabs.sentinellite.core.MonitoredApp
import com.altproductionlabs.sentinellite.core.PolicyStatus
import com.altproductionlabs.sentinellite.core.TokenType

class SecurityFragment : Fragment(R.layout.fragment_security) {

    private val viewModel: SentinelViewModel by activityViewModels {
        SentinelViewModelFactory(requireActivity().application as Application)
    }

    private val isolationListener = CompoundButton.OnCheckedChangeListener { _, isChecked ->
        viewModel.toggleIsolation(isChecked)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        (requireActivity() as? MainActivity)?.setToolbarTitle("Security Hub")

        val isolationSwitch = view.findViewById<Switch>(R.id.isolation_switch)
        val isolationStatus = view.findViewById<TextView>(R.id.isolation_status)
        val mfaList = view.findViewById<LinearLayout>(R.id.mfa_list)
        val evidenceSummary = view.findViewById<TextView>(R.id.evidence_summary)
        val auditLogContainer = view.findViewById<LinearLayout>(R.id.audit_log_container)
        val addTokenButton = view.findViewById<Button>(R.id.add_token_btn)
        val refreshEvidence = view.findViewById<Button>(R.id.refresh_evidence_btn)
        val simulationButton = view.findViewById<Button>(R.id.simulation_btn)
        val deviceOwnerStatus = view.findViewById<TextView>(R.id.device_owner_status)
        val adminLoginStatus = view.findViewById<TextView>(R.id.admin_login_status)
        val policyContainer = view.findViewById<LinearLayout>(R.id.policy_list)
        val appMonitorContainer = view.findViewById<LinearLayout>(R.id.app_monitor_list)
        val enrollButton = view.findViewById<Button>(R.id.enroll_device_owner_btn)
        val verifyButton = view.findViewById<Button>(R.id.verify_admin_btn)
        val scanAppsButton = view.findViewById<Button>(R.id.scan_apps_btn)

        isolationSwitch.setOnCheckedChangeListener(isolationListener)
        addTokenButton.setOnClickListener { showAddTokenDialog() }
        refreshEvidence.setOnClickListener { viewModel.refreshEvidenceVault() }
        simulationButton.setOnClickListener { openSimulationLab() }
        enrollButton.setOnClickListener { showEnrollDialog() }
        verifyButton.setOnClickListener { showVerifyDialog() }
        scanAppsButton.setOnClickListener { viewModel.refreshDeviceOwnerState() }

        viewModel.securityState.observe(viewLifecycleOwner) { state ->
            bindSecurityState(state, isolationSwitch, isolationStatus, mfaList, evidenceSummary, auditLogContainer)
        }

        viewModel.deviceOwnerState.observe(viewLifecycleOwner) { state ->
            bindDeviceOwnerState(state, deviceOwnerStatus, adminLoginStatus, policyContainer, appMonitorContainer)
        }
    }

    override fun onResume() {
        super.onResume()
        (requireActivity() as? MainActivity)?.setToolbarTitle("Security Hub")
    }

    private fun bindSecurityState(
        state: SecurityState,
        isolationSwitch: Switch,
        isolationStatus: TextView,
        mfaList: LinearLayout,
        evidenceSummary: TextView,
        auditLogContainer: LinearLayout
    ) {
        isolationSwitch.setOnCheckedChangeListener(null)
        isolationSwitch.isChecked = state.isolationState.enabled
        isolationSwitch.setOnCheckedChangeListener(isolationListener)
        isolationStatus.text = if (state.isolationState.enabled) {
            "Isolation active since ${state.isolationState.activatedAt?.let { formatAge(it) } ?: "just now"}"
        } else {
            "Radios active"
        }

        mfaList.removeAllViews()
        state.mfaTokens.forEach { token ->
            val row = layoutInflater.inflate(R.layout.view_security_card, mfaList, false)
            row.findViewById<ImageView>(R.id.security_icon).setImageResource(R.drawable.ic_key)
            row.findViewById<TextView>(R.id.security_title).text = token.label
            row.findViewById<TextView>(R.id.security_subtitle).text =
                "${token.type} • added ${formatAge(token.addedAt)}"
            row.findViewById<TextView>(R.id.security_status).text = token.lastValidatedAt?.let {
                "Validated ${formatAge(it)}"
            } ?: "Not validated"
            mfaList.addView(row)
        }
        if (state.mfaTokens.isEmpty()) {
            val empty = TextView(requireContext()).apply {
                text = "No hardware tokens registered"
                setTextColor(0xFF9AA1B9.toInt())
            }
            mfaList.addView(empty)
        }

        evidenceSummary.text = "${state.evidenceEntries.size} artifacts • ${state.vaultPath}"

        auditLogContainer.removeAllViews()
        state.auditLog.take(6).forEach { event ->
            val text = TextView(requireContext()).apply {
                text = "${formatAge(event.createdAt)} • ${event.message}"
                setTextColor(0xFFCCCCCC.toInt())
                setPadding(0, 4, 0, 4)
            }
            auditLogContainer.addView(text)
        }
    }

    private fun bindDeviceOwnerState(
        state: DeviceOwnerState,
        deviceOwnerStatus: TextView,
        adminLoginStatus: TextView,
        policyContainer: LinearLayout,
        appMonitorContainer: LinearLayout
    ) {
        val enrolled = state.enrolledAt?.let { "since ${formatAge(it)}" } ?: "not enrolled"
        deviceOwnerStatus.text = if (state.isDeviceOwner) {
            "${state.adminName} is device owner $enrolled"
        } else {
            "Device owner pending – enroll now"
        }
        val factors = state.loginState.requiredFactors.joinToString()
        val lastSuccess = formatTimestamp(state.loginState.lastSuccessAt)
        val lastFailure = formatTimestamp(state.loginState.lastFailureAt)
        adminLoginStatus.text = buildString {
            append("Factors: $factors • Failures: ${state.loginState.failureCount}")
            if (state.loginState.locked) append(" • LOCKED")
            if (lastSuccess.isNotEmpty()) append(" • Last ok $lastSuccess")
            if (lastFailure.isNotEmpty()) append(" • Last deny $lastFailure")
        }

        policyContainer.removeAllViews()
        state.policies.forEach { policy ->
            val row = layoutInflater.inflate(R.layout.view_policy_toggle, policyContainer, false)
            val switch = row.findViewById<Switch>(R.id.policy_switch)
            row.findViewById<TextView>(R.id.policy_title).text = policy.title
            row.findViewById<TextView>(R.id.policy_description).text = policy.description
            row.findViewById<TextView>(R.id.policy_status).text =
                "${if (policy.enforced) "Enforced" else "Monitor only"} • updated ${formatAge(policy.lastUpdated)}"
            switch.setOnCheckedChangeListener(null)
            switch.isChecked = policy.enforced
            switch.setOnCheckedChangeListener { _, isChecked ->
                viewModel.updatePolicy(policy.id, isChecked)
            }
            policyContainer.addView(row)
        }

        appMonitorContainer.removeAllViews()
        state.monitoredApps.take(12).forEach { app ->
            val row = layoutInflater.inflate(R.layout.view_monitored_app, appMonitorContainer, false)
            row.findViewById<TextView>(R.id.app_label).text = app.label
            row.findViewById<TextView>(R.id.app_package).text = app.packageName
            val status = row.findViewById<TextView>(R.id.app_status)
            status.text = "${app.status} • ${formatAge(app.lastEventAt)}"
            status.setTextColor(
                when (app.status) {
                    PolicyStatus.BLOCKED -> 0xFFFF0051.toInt()
                    PolicyStatus.WARNING -> 0xFFFFA733.toInt()
                    PolicyStatus.COMPLIANT -> 0xFF5AB3FF.toInt()
                }
            )
            row.findViewById<TextView>(R.id.app_notes).text = app.notes
            val action = row.findViewById<Button>(R.id.app_action_btn)
            action.text = if (app.status == PolicyStatus.BLOCKED) "Release" else "Quarantine"
            action.setOnClickListener {
                if (app.status == PolicyStatus.BLOCKED) {
                    confirmRelease(app)
                } else {
                    showQuarantineDialog(app)
                }
            }
            appMonitorContainer.addView(row)
        }
        if (state.monitoredApps.isEmpty()) {
            val empty = TextView(requireContext()).apply {
                text = "No apps indexed yet. Run a zero-trust scan."
                setTextColor(0xFF9AA1B9.toInt())
            }
            appMonitorContainer.addView(empty)
        }
    }

    private fun showAddTokenDialog() {
        val container = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 24, 32, 0)
        }
        val labelInput = EditText(requireContext()).apply {
            hint = "Label"
            setText("Token ${System.currentTimeMillis() % 1000}")
        }
        val spinner = Spinner(requireContext()).apply {
            adapter = ArrayAdapter(
                requireContext(),
                android.R.layout.simple_spinner_dropdown_item,
                TokenType.values().map { it.name }
            )
        }
        container.addView(labelInput)
        container.addView(spinner)

        AlertDialog.Builder(requireContext())
            .setTitle("Register MFA token")
            .setView(container)
            .setPositiveButton("Save") { dialog, _ ->
                val label = labelInput.text.toString().ifBlank { "Token" }
                val type = TokenType.valueOf(spinner.selectedItem.toString())
                viewModel.addToken(label, type)
                dialog.dismiss()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun showEnrollDialog() {
        val container = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 16, 32, 0)
        }
        val nameInput = EditText(requireContext()).apply {
            hint = "Administrator name"
        }
        val passInput = EditText(requireContext()).apply {
            hint = "Device owner passphrase"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
        }
        container.addView(nameInput)
        container.addView(passInput)

        AlertDialog.Builder(requireContext())
            .setTitle("Enroll device owner")
            .setView(container)
            .setPositiveButton("Enroll") { _, _ ->
                viewModel.enrollDeviceOwner(
                    nameInput.text.toString().ifBlank { "Sentinel Administrator" },
                    passInput.text.toString()
                )
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun showVerifyDialog() {
        val passInput = EditText(requireContext()).apply {
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            hint = "Passphrase"
            setPadding(48, 32, 48, 16)
        }
        AlertDialog.Builder(requireContext())
            .setTitle("Verify administrator")
            .setView(passInput)
            .setPositiveButton("Verify") { dialog, _ ->
                val secret = passInput.text.toString()
                viewModel.verifyAdmin(secret) { success ->
                    Toast.makeText(requireContext(), if (success) "Admin verified" else "Verification failed", Toast.LENGTH_SHORT).show()
                }
                dialog.dismiss()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun showQuarantineDialog(app: MonitoredApp) {
        val input = EditText(requireContext()).apply {
            hint = "Reason"
            setPadding(48, 24, 48, 16)
        }
        AlertDialog.Builder(requireContext())
            .setTitle("Quarantine ${app.label}")
            .setView(input)
            .setPositiveButton("Quarantine") { _, _ ->
                viewModel.quarantineApp(app.packageName, input.text.toString().ifBlank { "Policy violation" })
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun confirmRelease(app: MonitoredApp) {
        AlertDialog.Builder(requireContext())
            .setTitle("Release ${app.label}?")
            .setMessage("App will regain access to radios and storage policies.")
            .setPositiveButton("Release") { _, _ -> viewModel.releaseApp(app.packageName) }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun openSimulationLab() {
        parentFragmentManager.beginTransaction()
            .replace(R.id.content_container, SimulationFragment())
            .addToBackStack("simulation")
            .commit()
        (requireActivity() as? MainActivity)?.setToolbarTitle("Simulation Lab")
    }

    private fun formatAge(timestamp: Long): String {
        val minutes = ((System.currentTimeMillis() - timestamp) / 60000).coerceAtLeast(0)
        return if (minutes < 1) "just now" else "$minutes m ago"
    }

    private fun formatTimestamp(timestamp: Long?): String {
        return timestamp?.let { formatAge(it) } ?: ""
    }
}
