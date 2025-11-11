package com.sentinel.control.logging

import android.content.Context
import android.util.Log
import com.sentinel.control.network.ApprovalResponse
import com.sentinel.control.network.Challenge
import java.io.File
import java.security.MessageDigest
import java.time.Instant
import java.time.format.DateTimeFormatter

object AuditLog {
    private const val FILE_NAME = "sentinel_audit.log"
    private const val TAG = "AuditLog"

    private var digest: ByteArray = ByteArray(32)

    fun recordApproval(challenge: Challenge, approval: ApprovalResponse, context: Context) {
        append(context, "APPROVAL", "${'$'}{challenge.token}|${'$'}{approval.status}")
    }

    fun recordEvent(context: Context, type: String, message: String) {
        append(context, type, message)
    }

    private fun append(context: Context, type: String, message: String) {
        val file = File(context.filesDir, FILE_NAME)
        file.parentFile?.mkdirs()
        val timestamp = DateTimeFormatter.ISO_INSTANT.format(Instant.now())
        digest = MessageDigest.getInstance("SHA-256").digest(digest + message.toByteArray())
        file.appendText("${'$'}timestamp|${'$'}type|${'$'}message|${digest.toHex()}\n")
        Log.i(TAG, "${'$'}type logged")
    }

    fun readEntries(context: Context): List<AuditEvent> {
        val file = File(context.filesDir, FILE_NAME)
        if (!file.exists()) return emptyList()
        return file.readLines().takeLast(20).mapNotNull { line ->
            val parts = line.split("|")
            if (parts.size >= 4) {
                AuditEvent(parts[0], parts[1], parts[2], parts[3])
            } else null
        }
    }

    private fun ByteArray.toHex(): String = joinToString(separator = "") { String.format("%02x", it) }
}

data class AuditEvent(val timestamp: String, val type: String, val message: String, val digest: String)
