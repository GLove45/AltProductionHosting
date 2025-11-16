package com.sentinel.control.security.intel

import java.util.Locale

class SecurityScoreEngine {
    fun score(
        threatSurface: ThreatSurfaceReport,
        integrity: ZeroTrustIntegrityReport,
        network: NetworkIntelligenceReport,
        ml: BehavioralMlReport
    ): SecurityScore {
        val components = listOf(
            SecurityComponentStatus(
                id = "threat_surface",
                label = "Threat Surface",
                risk = threatSurface.riskScore,
                message = summarize(threatSurface.aggregatedMessages)
            ),
            SecurityComponentStatus(
                id = "integrity",
                label = "Device Integrity",
                risk = integrity.rootDetection.riskScore,
                message = summarize(integrity.aggregatedMessages)
            ),
            SecurityComponentStatus(
                id = "network",
                label = "Network",
                risk = network.alerts.size * 10,
                message = summarize(network.alerts)
            ),
            SecurityComponentStatus(
                id = "behaviour",
                label = "Behaviour",
                risk = if (ml.anomalyDetected) 60 else 5,
                message = summarize(ml.signals)
            )
        )
        val weighted = components.sumOf { it.risk }
        val overall = (100 - weighted / components.size).coerceIn(0, 100)
        val label = buildWindowLabel()
        return SecurityScore(overall, components, label)
    }

    private fun summarize(messages: List<String>): String {
        return if (messages.isEmpty()) "Nominal" else messages.joinToString(limit = 2)
    }

    private fun buildWindowLabel(): String {
        val now = java.text.SimpleDateFormat("HH:mm", Locale.US).format(java.util.Date())
        return "Last sweep @ ${'$'}now"
    }
}
