package com.altproductionlabs.sentinellite

import android.app.Application
import android.app.AlertDialog
import android.os.Bundle
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
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import com.altproductionlabs.sentinellite.core.SecurityState
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

        isolationSwitch.setOnCheckedChangeListener(isolationListener)
        addTokenButton.setOnClickListener { showAddTokenDialog() }
        refreshEvidence.setOnClickListener { viewModel.refreshEvidenceVault() }
        simulationButton.setOnClickListener { openSimulationLab() }

        viewModel.securityState.observe(viewLifecycleOwner) { state ->
            bindSecurityState(state, isolationSwitch, isolationStatus, mfaList, evidenceSummary, auditLogContainer)
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
}
