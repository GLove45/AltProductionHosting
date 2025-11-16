package com.altproductionlabs.sentinellite.security

import android.bluetooth.BluetoothAdapter
import android.content.Context
import android.content.SharedPreferences
import android.net.ConnectivityManager
import android.net.wifi.WifiManager
import android.os.Build
import android.os.PowerManager
import androidx.core.content.edit
import com.altproductionlabs.sentinellite.core.AuditLogEvent
import com.altproductionlabs.sentinellite.core.EvidenceEntry
import com.altproductionlabs.sentinellite.core.IsolationState
import com.altproductionlabs.sentinellite.core.MfaToken
import com.altproductionlabs.sentinellite.core.TokenType
import java.io.File
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

class IsolationController(private val context: Context) {
    private val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
    private val bluetoothAdapter = BluetoothAdapter.getDefaultAdapter()
    private val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

    fun enableIsolation(): IsolationState {
        val disabledRadios = mutableListOf<String>()
        if (wifiManager?.isWifiEnabled == true) {
            wifiManager.isWifiEnabled = false
            disabledRadios += "Wi-Fi"
        }
        if (bluetoothAdapter?.isEnabled == true) {
            bluetoothAdapter.disable()
            disabledRadios += "Bluetooth"
        }
        connectivityManager.bindProcessToNetwork(null)
        return IsolationState(true, System.currentTimeMillis(), disabledRadios)
    }

    fun disableIsolation(): IsolationState {
        return IsolationState(false, null, emptyList())
    }
}

class LocalMfaRegistry(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("mfa_registry", Context.MODE_PRIVATE)

    fun getTokens(): List<MfaToken> {
        val count = prefs.getInt("count", 0)
        return (0 until count).map { index ->
            val id = prefs.getString("${index}_id", "") ?: ""
            MfaToken(
                id = id,
                label = prefs.getString("${index}_label", "") ?: "",
                type = TokenType.valueOf(prefs.getString("${index}_type", TokenType.OTHER.name) ?: TokenType.OTHER.name),
                addedAt = prefs.getLong("${index}_added", 0L),
                lastValidatedAt = prefs.getLong("${index}_validated", 0L).takeIf { it > 0 }
            )
        }
    }

    fun addToken(token: MfaToken) {
        val tokens = getTokens().toMutableList().apply { add(token) }
        persist(tokens)
    }

    fun removeToken(id: String) {
        val tokens = getTokens().filterNot { it.id == id }
        persist(tokens)
    }

    private fun persist(tokens: List<MfaToken>) {
        prefs.edit {
            clear()
            putInt("count", tokens.size)
            tokens.forEachIndexed { index, token ->
                putString("${index}_id", token.id)
                putString("${index}_label", token.label)
                putString("${index}_type", token.type.name)
                putLong("${index}_added", token.addedAt)
                putLong("${index}_validated", token.lastValidatedAt ?: 0L)
            }
        }
    }
}

class EvidenceVault(private val context: Context) {
    private val vaultDir: File = File(context.filesDir, "evidence").apply { mkdirs() }

    fun vaultPath(): String = vaultDir.absolutePath

    fun listEvidence(): List<EvidenceEntry> {
        return vaultDir.listFiles()?.map { file ->
            EvidenceEntry(
                id = file.nameWithoutExtension,
                createdAt = file.lastModified(),
                title = file.name,
                description = "Local artifact",
                path = file.absolutePath,
                hash = file.sha256()
            )
        } ?: emptyList()
    }

    fun writeLog(name: String, content: String): EvidenceEntry {
        val file = File(vaultDir, name)
        file.writeText(content)
        return EvidenceEntry(
            id = file.nameWithoutExtension,
            createdAt = System.currentTimeMillis(),
            title = file.name,
            description = "Log entry",
            path = file.absolutePath,
            hash = file.sha256()
        )
    }

    fun captureWifiSnapshot(ssid: String?, issues: List<String>): EvidenceEntry {
        val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
        val name = "wifi_$timestamp.txt"
        val builder = buildString {
            appendLine("SSID: $ssid")
            appendLine("Issues: ${issues.joinToString()}")
        }
        return writeLog(name, builder)
    }

    private fun File.sha256(): String {
        val md = MessageDigest.getInstance("SHA-256")
        md.update(readBytes())
        return md.digest().joinToString("") { String.format("%02x", it) }
    }
}

class AuditLogger(private val context: Context) {
    private val logFile = File(context.filesDir, "audit.log")

    fun append(event: String): AuditLogEvent {
        val entry = AuditLogEvent(
            id = UUID.randomUUID().toString(),
            message = event,
            createdAt = System.currentTimeMillis()
        )
        logFile.appendText("${entry.createdAt}: ${entry.message}\n")
        return entry
    }

    fun read(): List<AuditLogEvent> {
        if (!logFile.exists()) return emptyList()
        return logFile.readLines().mapIndexed { index, line ->
            AuditLogEvent(
                id = index.toString(),
                message = line.substringAfter(": ", line),
                createdAt = line.substringBefore(": ", "0").toLongOrNull() ?: 0L
            )
        }
    }
}
