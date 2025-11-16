package com.altproductionlabs.sentinellite

import android.app.Application
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import com.altproductionlabs.sentinellite.core.SimulationScenario

class SimulationFragment : Fragment(R.layout.fragment_simulation) {

    private val viewModel: SentinelViewModel by activityViewModels {
        SentinelViewModelFactory(requireActivity().application as Application)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        (requireActivity() as? MainActivity)?.setToolbarTitle("Simulation Lab")
    }

    override fun onResume() {
        super.onResume()
        (requireActivity() as? MainActivity)?.setToolbarTitle("Simulation Lab")
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val container = view.findViewById<LinearLayout>(R.id.scenario_container)
        SimulationScenario.all.forEach { scenario ->
            container.addView(createScenarioCard(container, scenario))
        }
    }

    private fun createScenarioCard(container: LinearLayout, scenario: SimulationScenario): View {
        val card = layoutInflater.inflate(R.layout.view_security_card, container, false)
        card.findViewById<ImageView>(R.id.security_icon).setImageResource(R.drawable.ic_sentinel_head)
        card.findViewById<TextView>(R.id.security_title).text = scenario.label
        card.findViewById<TextView>(R.id.security_subtitle).text = scenario.description
        card.findViewById<TextView>(R.id.security_status).text = "Ready"
        val content = card.findViewById<LinearLayout>(R.id.security_card_content)
        val button = Button(requireContext()).apply {
            text = "Inject"
            textAllCaps = false
            setOnClickListener { viewModel.runSimulation(scenario) }
        }
        content.addView(button)
        return card
    }
}
