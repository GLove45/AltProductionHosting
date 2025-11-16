package com.altproductionlabs.sentinellite

import android.os.Bundle
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import androidx.fragment.app.Fragment

class PlaybooksFragment : Fragment(R.layout.fragment_playbooks) {

    data class PlaybookVM(
        val name: String,
        val scope: String,
        val status: String
    )

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val list = view.findViewById<LinearLayout>(R.id.playbooks_list)

        val playbooks = listOf(
            PlaybookVM("Constrain SSH", "All nodes, role=server", "Armed"),
            PlaybookVM("Isolate Sandbox", "role=sandbox", "Armed"),
            PlaybookVM("Observe High-risk", "tag=high-risk", "Draft")
        )

        playbooks.forEach { p ->
            val card = layoutInflater.inflate(R.layout.view_playbook_card, list, false)
            card.findViewById<TextView>(R.id.playbook_name).text = p.name
            card.findViewById<TextView>(R.id.playbook_scope).text = p.scope
            card.findViewById<TextView>(R.id.playbook_status).text = p.status
            list.addView(card)
        }
    }
}
