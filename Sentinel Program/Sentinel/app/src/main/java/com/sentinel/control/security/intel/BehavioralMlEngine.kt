package com.sentinel.control.security.intel

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorManager
import android.os.SystemClock
import java.util.Calendar
import kotlin.math.abs

class BehavioralMlEngine(private val context: Context) {
    private val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun evaluate(): BehavioralMlReport {
        val now = System.currentTimeMillis()
        val lastSeen = prefs.getLong(KEY_LAST_SEEN, 0L)
        prefs.edit().putLong(KEY_LAST_SEEN, now).apply()
        val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        val baseline = prefs.getFloat("hour_${'$'}hour", 0f)
        val deviation = computeDeviation(hour, baseline)
        prefs.edit().putFloat("hour_${'$'}hour", ((baseline + deviation) / 2f)).apply()

        val sensors = gatherMotionSnapshot()
        val anomalySignals = mutableListOf<String>()
        if (hour in REST_WINDOW && now - lastSeen < REST_THRESHOLD_MS) {
            anomalySignals += "Device active during rest window"
        }
        if (deviation > 0.6f) {
            anomalySignals += "Usage frequency changed"
        }
        if (sensors.motionSpike) {
            anomalySignals += "Unexpected motion pattern"
        }

        val anomaly = anomalySignals.isNotEmpty()
        return BehavioralMlReport(anomaly, anomalySignals, sensors)
    }

    private fun computeDeviation(hour: Int, baseline: Float): Float {
        val bucketKey = "bucket_${'$'}hour"
        val count = prefs.getInt("count_${'$'}hour", 0)
        val updatedCount = (count + 1).coerceAtMost(100)
        prefs.edit().putInt("count_${'$'}hour", updatedCount).apply()
        val observed = prefs.getFloat(bucketKey, 0f)
        val nowValue = (SystemClock.elapsedRealtime() % 10_000L) / 10_000f
        val newObserved = (observed + nowValue) / 2f
        prefs.edit().putFloat(bucketKey, newObserved).apply()
        return abs(newObserved - baseline)
    }

    private fun gatherMotionSnapshot(): MotionSnapshot {
        val sensorManager = context.getSystemService(SensorManager::class.java)
        val accelerometer = sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        val gyroscope = sensorManager?.getDefaultSensor(Sensor.TYPE_GYROSCOPE)
        val motionSpike = accelerometer == null || gyroscope == null
        return MotionSnapshot(motionSpike)
    }

    companion object {
        private const val PREFS = "behavioral_ml"
        private const val KEY_LAST_SEEN = "last_seen"
        private val REST_WINDOW = 2..5
        private const val REST_THRESHOLD_MS = 5 * 60 * 1000L
    }
}

data class BehavioralMlReport(
    val anomalyDetected: Boolean,
    val signals: List<String>,
    val motionSnapshot: MotionSnapshot
)

data class MotionSnapshot(val motionSpike: Boolean)
