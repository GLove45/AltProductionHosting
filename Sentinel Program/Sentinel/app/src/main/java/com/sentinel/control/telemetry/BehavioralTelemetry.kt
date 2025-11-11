package com.sentinel.control.telemetry

import android.content.Context
import android.os.SystemClock
import com.sentinel.control.logging.SentinelLogger
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.time.Instant

object BehavioralTelemetry {
    private const val PREFS = "sentinel_telemetry"
    private const val APPROVAL_COUNT = "approval_count"
    private const val LAST_APPROVAL = "last_approval"
    private const val LOCKDOWN_EVENTS = "lockdown_events"

    private lateinit var context: Context

    fun initialize(context: Context) {
        this.context = context.applicationContext
    }

    fun trackApproval() {
        ensureInitialized()
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val count = prefs.getInt(APPROVAL_COUNT, 0) + 1
        prefs.edit()
            .putInt(APPROVAL_COUNT, count)
            .putLong(LAST_APPROVAL, Instant.now().toEpochMilli())
            .apply()
        SentinelLogger.info("Approval telemetry recorded: count=${'$'}count")
    }

    fun trackLockdown(enabled: Boolean) {
        ensureInitialized()
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val events = prefs.getInt(LOCKDOWN_EVENTS, 0) + 1
        prefs.edit().putInt(LOCKDOWN_EVENTS, events).apply()
        SentinelLogger.info("Lockdown toggled: enabled=${'$'}enabled events=${'$'}events")
    }

    fun snapshot(): TelemetrySnapshot {
        ensureInitialized()
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        return TelemetrySnapshot(
            approvals = prefs.getInt(APPROVAL_COUNT, 0),
            lastApproval = prefs.getLong(LAST_APPROVAL, 0L),
            lockdownEvents = prefs.getInt(LOCKDOWN_EVENTS, 0)
        )
    }

    private fun ensureInitialized() {
        if (!this::context.isInitialized) {
            throw IllegalStateException("BehavioralTelemetry not initialized")
        }
    }
}

data class TelemetrySnapshot(val approvals: Int, val lastApproval: Long, val lockdownEvents: Int)
