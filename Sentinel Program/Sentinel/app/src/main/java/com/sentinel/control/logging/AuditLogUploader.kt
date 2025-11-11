package com.sentinel.control.logging

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.sentinel.control.network.SentinelApi
import com.sentinel.control.util.JsonUtil
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class AuditLogUploader(appContext: Context, workerParams: WorkerParameters) : CoroutineWorker(appContext, workerParams) {
    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val entries = AuditLog.readEntries(applicationContext)
        if (entries.isEmpty()) return@withContext Result.success()
        return@withContext try {
            val api = SentinelApi(applicationContext)
            val payload = JsonUtil.toJson(mapOf("logs" to entries))
            val response = api.pushAuditLogs(payload)
            SentinelLogger.info("Audit logs uploaded: ${'$'}response")
            Result.success()
        } catch (ex: Exception) {
            SentinelLogger.error("Audit upload failed", ex)
            Result.retry()
        }
    }
}
