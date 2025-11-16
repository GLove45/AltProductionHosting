package com.sentinel.control.data

import android.content.Context

/** Stores alert and auto-response preferences for the Sentinel app. */
class AlertSettingsStore(private val context: Context) {
    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun load(): AlertSettings {
        return AlertSettings(
            pushEnabled = prefs.getBoolean(KEY_PUSH_ENABLED, true),
            isolationOnThreat = prefs.getBoolean(KEY_ISOLATION, true),
            requireMfaOnThreat = prefs.getBoolean(KEY_RISK_MFA, true)
        )
    }

    fun update(transform: (AlertSettings) -> AlertSettings): AlertSettings {
        val updated = transform(load())
        prefs.edit()
            .putBoolean(KEY_PUSH_ENABLED, updated.pushEnabled)
            .putBoolean(KEY_ISOLATION, updated.isolationOnThreat)
            .putBoolean(KEY_RISK_MFA, updated.requireMfaOnThreat)
            .apply()
        return updated
    }

    companion object {
        private const val PREFS_NAME = "sentinel_alert_settings"
        private const val KEY_PUSH_ENABLED = "push_enabled"
        private const val KEY_ISOLATION = "isolation_enabled"
        private const val KEY_RISK_MFA = "risk_mfa"
    }
}

data class AlertSettings(
    val pushEnabled: Boolean = true,
    val isolationOnThreat: Boolean = true,
    val requireMfaOnThreat: Boolean = true
)
