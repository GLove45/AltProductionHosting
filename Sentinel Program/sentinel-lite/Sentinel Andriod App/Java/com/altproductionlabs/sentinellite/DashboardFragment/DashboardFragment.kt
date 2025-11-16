package com.altproductionlabs.sentinellite

import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import androidx.fragment.app.Fragment

class DashboardFragment : Fragment(R.layout.fragment_dashboard) {

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val riskScore = view.findViewById<TextView>(R.id.risk_score_value)
        val summary = view.findViewById<TextView>(R.id.summary_stats)
        val alertsContainer = view.findViewById<LinearLayout>(R.id.alerts_container)

        riskScore.text = "12"
        summary.text = "4 nodes online • 0 isolated • 3 live alerts"

        val sampleAlerts = listOf(
            "P1 · Unauthorized SSH key added on node1.alt-labs.internal · 2 min ago",
            "P2 · Suspicious outbound traffic from node2.alt-labs.internal · 14 min ago",
            "P3 · Policy drift in /etc/apt/sources.list on node3 · 1 h ago"
        )

        sampleAlerts.forEach { msg ->
            val item = TextView(requireContext()).apply {
                text = msg
                setTextColor(Color.parseColor("#DDDDDD"))
                textSize = 14f
                setPadding(0, 8, 0, 8)
            }
            alertsContainer.addView(item)
        }
    }
}
