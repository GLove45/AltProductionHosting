package com.altproductionlabs.sentinellite

import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.fragment.app.Fragment

class AlertsFragment : Fragment(R.layout.fragment_alerts) {

    data class AlertVM(
        val severity: String,
        val title: String,
        val node: String,
        val age: String
    )

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val list = view.findViewById<LinearLayout>(R.id.alerts_list)

        val sample = listOf(
            AlertVM("P1", "Privilege escalation chain detected", "node1.alt-labs.internal", "2 min ago"),
            AlertVM("P1", "Evidence vault tamper attempt", "node3.alt-labs.internal", "5 min ago"),
            AlertVM("P2", "Suspicious outbound to 185.23.10.4", "node2.alt-labs.internal", "14 min ago"),
            AlertVM("P3", "Policy drift in /usr/bin/nginx", "node4.alt-labs.internal", "1 h ago")
        )

        sample.forEach { alert ->
            val card = layoutInflater.inflate(R.layout.view_alert_card, list, false)
            card.findViewById<TextView>(R.id.alert_title).text = alert.title
            card.findViewById<TextView>(R.id.alert_meta).text =
                "${alert.severity} • ${alert.node} • ${alert.age}"
            list.addView(card)
        }
    }
}
