package com.sentinel.control.network

import android.content.Context
import android.util.Log
import com.sentinel.control.mfa.PolicyResult
import com.sentinel.control.util.JsonUtil
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.time.Instant
import java.util.concurrent.TimeUnit

class SentinelApi(private val context: Context) {

    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(5, TimeUnit.SECONDS)
        .build()

    fun fetchChallenge(keyId: String): Challenge {
        val request = Request.Builder()
            .url("${'$'}{baseUrl()}/challenge?keyId=${'$'}keyId")
            .get()
            .build()
        client.newCall(request).execute().use { response ->
            val payload = response.body?.string().orEmpty()
            Log.v(TAG, "Challenge response: ${'$'}payload")
            return JsonUtil.fromJson(payload, Challenge::class.java)
        }
    }

    fun approveNonce(signature: String, policy: PolicyResult): ApprovalResponse {
        val approval = mapOf(
            "signature" to signature,
            "policy" to policy.toPayload(),
            "timestamp" to Instant.now().toEpochMilli()
        )
        val body = JsonUtil.toJson(approval)
            .toRequestBody("application/json".toMediaType())
        val request = Request.Builder()
            .url("${'$'}{baseUrl()}/approve")
            .post(body)
            .build()
        client.newCall(request).execute().use { response ->
            val payload = response.body?.string().orEmpty()
            Log.v(TAG, "Approve response: ${'$'}payload")
            return JsonUtil.fromJson(payload, ApprovalResponse::class.java)
        }
    }

    fun registerDevice(publicKey: String): ApiResponse {
        val body = JsonUtil.toJson(mapOf("publicKey" to publicKey))
            .toRequestBody("application/json".toMediaType())
        val request = Request.Builder()
            .url("${'$'}{baseUrl()}/register")
            .post(body)
            .build()
        client.newCall(request).execute().use { response ->
            val payload = response.body?.string().orEmpty()
            Log.v(TAG, "Register response: ${'$'}payload")
            return JsonUtil.fromJson(payload, ApiResponse::class.java)
        }
    }

    fun revokeDevice(keyId: String): ApiResponse {
        val body = JsonUtil.toJson(mapOf("keyId" to keyId))
            .toRequestBody("application/json".toMediaType())
        val request = Request.Builder()
            .url("${'$'}{baseUrl()}/revoke")
            .post(body)
            .build()
        client.newCall(request).execute().use { response ->
            val payload = response.body?.string().orEmpty()
            Log.v(TAG, "Revoke response: ${'$'}payload")
            return JsonUtil.fromJson(payload, ApiResponse::class.java)
        }
    }

    fun triggerQuarantine(): ApiResponse {
        val request = Request.Builder()
            .url("${'$'}{baseUrl()}/quarantine")
            .post("".toRequestBody(null))
            .build()
        client.newCall(request).execute().use { response ->
            val payload = response.body?.string().orEmpty()
            Log.v(TAG, "Quarantine response: ${'$'}payload")
            return JsonUtil.fromJson(payload, ApiResponse::class.java)
        }
    }

    fun pushAuditLogs(bodyJson: String): ApiResponse {
        val request = Request.Builder()
            .url("${'$'}{baseUrl()}/audit")
            .post(bodyJson.toRequestBody("application/json".toMediaType()))
            .build()
        client.newCall(request).execute().use { response ->
            val payload = response.body?.string().orEmpty()
            Log.v(TAG, "Audit push response: ${'$'}payload")
            return JsonUtil.fromJson(payload, ApiResponse::class.java)
        }
    }

    private fun baseUrl(): String {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        return prefs.getString(BASE_URL_KEY, DEFAULT_BASE_URL) ?: DEFAULT_BASE_URL
    }

    companion object {
        private const val PREFS = "sentinel_network"
        private const val BASE_URL_KEY = "base_url"
        private const val DEFAULT_BASE_URL = "https://sentinel-pi.local"
        private const val TAG = "SentinelApi"
    }
}

data class Challenge(val token: String, val nonce: String, val expiresAt: Long)

data class ApprovalResponse(val token: String, val expiresAt: Long, val timestamp: String, val status: String)

data class ApiResponse(val message: String?, val error: String?)
