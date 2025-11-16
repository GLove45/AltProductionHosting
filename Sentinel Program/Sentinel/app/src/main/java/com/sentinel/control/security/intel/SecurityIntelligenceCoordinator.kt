package com.sentinel.control.security.intel

import android.content.Context
import com.sentinel.control.util.HygieneReport
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class SecurityIntelligenceCoordinator(private val context: Context) {
    private val threatSurfaceMonitor = ThreatSurfaceMonitor(context)
    private val integrityFramework = ZeroTrustIntegrityFramework(context)
    private val networkModule = NetworkIntelligenceModule(context)
    private val mlEngine = BehavioralMlEngine(context)
    private val scoreEngine = SecurityScoreEngine()

    suspend fun collect(): SecurityIntelligenceReport = withContext(Dispatchers.Default) {
        val threatReport = threatSurfaceMonitor.snapshot()
        val integrityReport = integrityFramework.evaluate()
        val networkReport = networkModule.evaluate()
        val mlReport = mlEngine.evaluate()
        val score = scoreEngine.score(threatReport, integrityReport, networkReport, mlReport)
        val storyboard = buildStoryboard(threatReport, integrityReport, networkReport, mlReport, score)
        SecurityIntelligenceReport(
            threatSurface = threatReport,
            integrity = integrityReport,
            network = networkReport,
            ml = mlReport,
            score = score,
            storyboard = storyboard,
            hygieneReport = HygieneReport(
                isSecure = threatReport.riskScore < 40 && integrityReport.rootDetection.riskScore < 40,
                messages = threatReport.aggregatedMessages + integrityReport.aggregatedMessages
            )
        )
    }

    private fun buildStoryboard(
        threat: ThreatSurfaceReport,
        integrity: ZeroTrustIntegrityReport,
        network: NetworkIntelligenceReport,
        ml: BehavioralMlReport,
        score: SecurityScore
    ): List<AlertStoryboardEntry> {
        val now = System.currentTimeMillis()
        val entries = mutableListOf<AlertStoryboardEntry>()
        if (threat.permissionDelta.newDangerousPermissions.isNotEmpty()) {
            entries += AlertStoryboardEntry(
                timestamp = now - 3_000,
                summary = "Permissions changed",
                detail = threat.permissionDelta.describe()
            )
        }
        if (integrity.rootDetection.flags.isNotEmpty()) {
            entries += AlertStoryboardEntry(
                timestamp = now - 2_000,
                summary = "Integrity anomalies",
                detail = integrity.rootDetection.flags.joinToString()
            )
        }
        if (network.alerts.isNotEmpty()) {
            entries += AlertStoryboardEntry(
                timestamp = now - 1_000,
                summary = "Network warnings",
                detail = network.alerts.joinToString()
            )
        }
        if (ml.anomalyDetected) {
            entries += AlertStoryboardEntry(
                timestamp = now,
                summary = "Behavioural anomaly",
                detail = ml.signals.joinToString().ifEmpty { "Usage deviates from baseline" }
            )
        }
        if (entries.isEmpty()) {
            entries += AlertStoryboardEntry(
                timestamp = now,
                summary = "All clear",
                detail = "No anomalous activity in the last sweep"
            )
        }
        return entries
    }
}

data class SecurityIntelligenceReport(
    val threatSurface: ThreatSurfaceReport,
    val integrity: ZeroTrustIntegrityReport,
    val network: NetworkIntelligenceReport,
    val ml: BehavioralMlReport,
    val score: SecurityScore,
    val storyboard: List<AlertStoryboardEntry>,
    val hygieneReport: HygieneReport
)

data class AlertStoryboardEntry(
    val timestamp: Long,
    val summary: String,
    val detail: String
) {
    fun formattedTimestamp(): String {
        val formatter = SimpleDateFormat("HH:mm:ss", Locale.US)
        return formatter.format(Date(timestamp))
    }
}

data class SecurityScore(
    val overall: Int,
    val breakdown: List<SecurityComponentStatus>,
    val windowLabel: String
)

data class SecurityComponentStatus(
    val id: String,
    val label: String,
    val risk: Int,
    val message: String
)
