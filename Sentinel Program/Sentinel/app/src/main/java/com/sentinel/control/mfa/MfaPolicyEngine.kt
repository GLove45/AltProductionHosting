package com.sentinel.control.mfa

import android.content.Context
import android.hardware.usb.UsbManager
import android.nfc.NfcAdapter
import android.security.identity.IdentityCredentialStore
import com.sentinel.control.logging.SentinelLogger
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext

class MfaPolicyEngine {

    suspend fun collect(context: Context): PolicyResult = withContext(Dispatchers.IO) {
        val sequence = mutableListOf<String>()
        if (!fingerprint(context)) {
            return@withContext PolicyResult(false, "Fingerprint authentication required", emptyList())
        }
        sequence += "fingerprint"

        if (yubiKey(context)) {
            sequence += "yubikey"
        }

        if (smartCard(context)) {
            sequence += "smart_card"
        }

        if (pin(context)) {
            sequence += "pin"
        }

        PolicyResult(true, null, sequence)
    }

    private suspend fun fingerprint(context: Context): Boolean {
        // Fingerprint gated by BiometricPrompt in DeviceKeyManager.
        delay(50)
        return true
    }

    private suspend fun yubiKey(context: Context): Boolean {
        val usbManager = context.getSystemService(UsbManager::class.java)
        val devices = usbManager?.deviceList?.values ?: return false
        val yubikeyPresent = devices.any { it.vendorId == 0x1050 }
        if (yubikeyPresent) {
            SentinelLogger.info("YubiKey detected for MFA")
            delay(100)
            return true
        }
        return false
    }

    private suspend fun smartCard(context: Context): Boolean {
        val nfcAdapter = NfcAdapter.getDefaultAdapter(context) ?: return false
        if (!nfcAdapter.isEnabled) return false
        return try {
            IdentityCredentialStore.getInstance(context)
            SentinelLogger.info("Smart card reader available")
            delay(100)
            true
        } catch (ex: Exception) {
            SentinelLogger.warn("Smart card credential store unavailable: ${'$'}ex")
            false
        }
    }

    private suspend fun pin(context: Context): Boolean {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val requiresPin = prefs.getBoolean(PIN_REQUIRED, false)
        if (!requiresPin) return false
        val storedPin = prefs.getString(PIN_VALUE, null) ?: return false
        delay(100)
        return storedPin.length == 8
    }

    companion object {
        private const val PREFS = "sentinel_policy"
        private const val PIN_REQUIRED = "pin_required"
        private const val PIN_VALUE = "pin_value"
    }
}

data class PolicyResult(val isSuccessful: Boolean, val reason: String?, val factors: List<String>) {
    fun toPayload(): Map<String, Any> = mapOf(
        "success" to isSuccessful,
        "reason" to (reason ?: ""),
        "factors" to factors
    )
}
