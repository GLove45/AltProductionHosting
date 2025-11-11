package com.sentinel.control

import android.app.Application
import android.util.Log
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.sentinel.control.logging.AuditLogUploader
import com.sentinel.control.telemetry.BehavioralTelemetry
import java.util.concurrent.TimeUnit

class SentinelApp : Application() {
    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "SentinelApp initialized")
        BehavioralTelemetry.initialize(this)
        scheduleAuditUpload()
    }

    private fun scheduleAuditUpload() {
        val work = PeriodicWorkRequestBuilder<AuditLogUploader>(15, TimeUnit.MINUTES)
            .addTag(AUDIT_UPLOAD_TAG)
            .build()
        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            AUDIT_UPLOAD_TAG,
            ExistingPeriodicWorkPolicy.KEEP,
            work
        )
    }

    companion object {
        private const val TAG = "SentinelApp"
        private const val AUDIT_UPLOAD_TAG = "audit_upload"
    }
}
