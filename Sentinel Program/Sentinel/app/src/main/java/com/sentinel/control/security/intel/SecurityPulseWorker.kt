package com.sentinel.control.security.intel

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.sentinel.control.data.AlertSettingsStore
import com.sentinel.control.logging.SecurityAlertNotifier

class SecurityPulseWorker(appContext: Context, params: WorkerParameters) : CoroutineWorker(appContext, params) {
    override suspend fun doWork(): Result {
        val coordinator = SecurityIntelligenceCoordinator(applicationContext)
        val report = coordinator.collect()
        val settings = AlertSettingsStore(applicationContext).load()
        SecurityAlertNotifier.publish(applicationContext, report, settings)
        return Result.success()
    }

    companion object {
        const val WORK_NAME = "security_pulse"
    }
}
