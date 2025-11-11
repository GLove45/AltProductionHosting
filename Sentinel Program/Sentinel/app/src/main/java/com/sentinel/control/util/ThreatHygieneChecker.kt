package com.sentinel.control.util

import android.content.Context
import android.os.Build
import android.provider.Settings
import android.util.Log
import com.sentinel.control.logging.SentinelLogger

class ThreatHygieneChecker {
    fun evaluate(context: Context): HygieneReport {
        val messages = mutableListOf<String>()
        val malwareReport = MalwareScanner(context).scan()
        if (!malwareReport.clean) {
            messages += "Untrusted packages: ${'$'}{malwareReport.flaggedPackages.joinToString()}"
        }
        val heuristics = HeuristicsEngine(context).evaluate()
        if (!heuristics.healthy) {
            messages.addAll(heuristics.anomalies)
        }

        val hygieneChecks = listOf(
            checkAdbDisabled(context, messages),
            checkDeveloperOptions(context, messages),
            checkRootAccess(messages),
            checkSelinux(messages),
            malwareReport.clean,
            heuristics.healthy
        )
        val isSecure = hygieneChecks.all { it }
        return HygieneReport(isSecure, messages)
    }

    private fun checkAdbDisabled(context: Context, messages: MutableList<String>): Boolean {
        val enabled = Settings.Global.getInt(context.contentResolver, Settings.Global.ADB_ENABLED, 0) == 1
        if (enabled) {
            messages += "ADB must be disabled"
        }
        return !enabled
    }

    private fun checkDeveloperOptions(context: Context, messages: MutableList<String>): Boolean {
        val enabled = Settings.Global.getInt(context.contentResolver, Settings.Global.DEVELOPMENT_SETTINGS_ENABLED, 0) == 1
        if (enabled) messages += "Developer options enabled"
        return !enabled
    }

    private fun checkRootAccess(messages: MutableList<String>): Boolean {
        val buildTags = Build.TAGS
        val rooted = buildTags != null && buildTags.contains("test-keys")
        if (rooted) messages += "Device appears rooted"
        return !rooted
    }

    private fun checkSelinux(messages: MutableList<String>): Boolean {
        val enforcing = try {
            val process = Runtime.getRuntime().exec("getenforce")
            process.inputStream.bufferedReader().use { it.readText().trim() == "Enforcing" }
        } catch (ex: Exception) {
            Log.w(TAG, "SELinux check failed", ex)
            messages += "Unable to verify SELinux"
            false
        }
        if (!enforcing) messages += "SELinux not enforcing"
        return enforcing
    }

    companion object {
        private const val TAG = "ThreatHygieneChecker"
    }
}

data class HygieneReport(val isSecure: Boolean, val messages: List<String> = emptyList())
