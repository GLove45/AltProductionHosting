package com.sentinel.control.security.intel

import android.app.ActivityManager
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.content.Context
import android.net.wifi.WifiManager
import com.sentinel.control.logging.SentinelLogger

class ActiveDefenseController(private val context: Context) {
    fun enterIsolation() {
        disableWifi()
        disableBluetooth()
        killForegroundThreats()
    }

    private fun disableWifi() {
        val wifi = context.applicationContext.getSystemService(WifiManager::class.java)
        try {
            if (wifi?.isWifiEnabled == true) {
                wifi.isWifiEnabled = false
                SentinelLogger.warn("Wifi disabled due to isolation mode")
            }
        } catch (ex: SecurityException) {
            SentinelLogger.warn("Wifi toggle blocked", ex)
        }
    }

    private fun disableBluetooth() {
        val manager = context.getSystemService(BluetoothManager::class.java)
        val adapter = manager?.adapter ?: BluetoothAdapter.getDefaultAdapter()
        try {
            if (adapter?.isEnabled == true) {
                adapter.disable()
                SentinelLogger.warn("Bluetooth disabled due to isolation mode")
            }
        } catch (ex: SecurityException) {
            SentinelLogger.warn("Bluetooth toggle blocked", ex)
        }
    }

    private fun killForegroundThreats() {
        val activityManager = context.getSystemService(ActivityManager::class.java)
        val processes = activityManager?.runningAppProcesses ?: return
        processes.filter { it.importance <= ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND }
            .forEach { proc ->
                try {
                    android.os.Process.killProcess(proc.pid)
                } catch (ex: SecurityException) {
                    SentinelLogger.warn("Unable to kill ${'$'}{proc.processName}", ex)
                }
            }
    }
}
