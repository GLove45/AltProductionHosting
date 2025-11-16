package com.altproductionlabs.sentinellite

import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import androidx.fragment.app.Fragment

class NodesFragment : Fragment(R.layout.fragment_nodes) {

    data class NodeVM(
        val name: String,
        val role: String,
        val status: String
    )

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val list = view.findViewById<LinearLayout>(R.id.nodes_list)

        val nodes = listOf(
            NodeVM("node1.alt-labs.internal", "Ingress / API", "Healthy"),
            NodeVM("node2.alt-labs.internal", "Sentinel core", "Healthy"),
            NodeVM("node3.alt-labs.internal", "Evidence / Storage", "Degraded"),
            NodeVM("node4.alt-labs.internal", "Sandbox / Playbooks", "Isolated")
        )

        nodes.forEach { node ->
            val card = layoutInflater.inflate(R.layout.view_node_card, list, false)
            card.findViewById<TextView>(R.id.node_name).text = node.name
            card.findViewById<TextView>(R.id.node_role).text = node.role
            card.findViewById<TextView>(R.id.node_status).text = node.status
            list.addView(card)
        }
    }
}
