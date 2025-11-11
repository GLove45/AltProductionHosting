package com.sentinel.control.data

import android.content.Context
import com.sentinel.control.network.SentinelApi
import com.sentinel.control.security.DeviceKeyManager

class DeviceRegistrationManager(private val context: Context) {

    fun register(): RegistrationResult {
        return try {
            val keyManager = DeviceKeyManager(context)
            val api = SentinelApi(context)
            val publicKey = keyManager.ensureKey().publicKey
            val response = api.registerDevice(java.util.Base64.getEncoder().encodeToString(publicKey.encoded))
            RegistrationResult(message = response.message, error = response.error)
        } catch (ex: Exception) {
            RegistrationResult(message = null, error = ex.message)
        }
    }

    fun revoke(): RegistrationResult {
        return try {
            val keyManager = DeviceKeyManager(context)
            val api = SentinelApi(context)
            val response = api.revokeDevice(keyManager.getKeyId())
            RegistrationResult(message = response.message, error = response.error)
        } catch (ex: Exception) {
            RegistrationResult(message = null, error = ex.message)
        }
    }
}

data class RegistrationResult(val message: String?, val error: String? = null)
