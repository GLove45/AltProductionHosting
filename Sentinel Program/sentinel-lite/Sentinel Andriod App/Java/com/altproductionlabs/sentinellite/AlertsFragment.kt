package com.altproductionlabs.sentinellite

import android.app.Application
import android.os.Bundle
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import com.altproductionlabs.sentinellite.core.SentinelAlert

class AlertsFragment : Fragment(R.layout.fragment_alerts) {

    private val viewModel: SentinelViewModel by activityViewModels {
        SentinelViewModelFactory(requireActivity().application as Application)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val list = view.findViewById<LinearLayout>(R.id.alerts_list)
        val summary = view.findViewById<TextView>(R.id.alerts_summary)

        viewModel.alerts.observe(viewLifecycleOwner) { alerts ->
            summary.text = "${alerts.size} active alerts"
            list.removeAllViews()
            alerts.forEach { alert ->
                list.addView(createCard(list, alert))
            }
        }
    }

    private fun createCard(container: LinearLayout, alert: SentinelAlert): View {
        val card = layoutInflater.inflate(R.layout.view_alert_card, container, false)
        card.findViewById<TextView>(R.id.alert_title).apply {
            text = alert.title
            setTextColor(alert.severity.accentColor)
        }
        card.findViewById<TextView>(R.id.alert_meta).text =
            "${alert.severity} • ${alert.source} • ${formatAge(alert.createdAt)}"
        card.findViewById<View>(R.id.alert_ack_button).apply {
            isEnabled = !alert.acknowledged
            alpha = if (alert.acknowledged) 0.4f else 1f
            setOnClickListener { viewModel.acknowledgeAlert(alert.id) }
        }
        return card
    }

    private fun formatAge(timestamp: Long): String {
        val minutes = ((System.currentTimeMillis() - timestamp) / 60000).coerceAtLeast(0)
        return if (minutes < 1) "just now" else "$minutes m ago"
    }
}
