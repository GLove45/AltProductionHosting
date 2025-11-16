package com.sentinel.control.logging

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.sentinel.control.MainActivity
import com.sentinel.control.R
import com.sentinel.control.data.AlertSettings
import com.sentinel.control.security.intel.SecurityIntelligenceReport

object SecurityAlertNotifier {
    private const val CHANNEL_ID = "sentinel_alerts"
    private const val NOTIFICATION_ID = 0x515

    fun publish(context: Context, report: SecurityIntelligenceReport, settings: AlertSettings) {
        if (!settings.pushEnabled) return
        if (report.score.overall > 70 && report.network.alerts.isEmpty() && !report.ml.anomalyDetected) return
        ensureChannel(context)
        val intent = Intent(context, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        val body = buildString {
            append("Score ${'$'}{report.score.overall}")
            if (report.storyboard.isNotEmpty()) {
                append(" • ")
                append(report.storyboard.first().summary)
            }
        }
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Sentinel threat alert")
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(report.storyboard.joinToString("\n") { entry ->
                "${'$'}{entry.formattedTimestamp()} - ${'$'}{entry.summary}: ${'$'}{entry.detail}"
            }))
            .setColor(Color.RED)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()
        NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, notification)
    }

    private fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(NotificationManager::class.java)
        val existing = manager?.getNotificationChannel(CHANNEL_ID)
        if (existing != null) return
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Sentinel Alerts",
            NotificationManager.IMPORTANCE_HIGH
        )
        channel.description = "Risk-based alerts"
        manager?.createNotificationChannel(channel)
    }
}
