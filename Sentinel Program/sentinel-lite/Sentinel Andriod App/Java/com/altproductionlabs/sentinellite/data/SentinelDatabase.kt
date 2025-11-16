package com.altproductionlabs.sentinellite.data

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import com.altproductionlabs.sentinellite.core.AlertEntity
import com.altproductionlabs.sentinellite.core.AlertSeverity
import com.altproductionlabs.sentinellite.core.AuditLogEntity
import com.altproductionlabs.sentinellite.core.DashboardState
import com.altproductionlabs.sentinellite.core.NetworkSnapshotEntity
import com.altproductionlabs.sentinellite.core.RiskScore
import com.altproductionlabs.sentinellite.core.RiskScoreEntity
import com.altproductionlabs.sentinellite.core.SecurityState
import com.altproductionlabs.sentinellite.core.SentinelAlert
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

@Dao
interface AlertDao {
    @Query("SELECT * FROM alerts ORDER BY createdAt DESC")
    fun streamAlerts(): Flow<List<AlertEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(alerts: List<AlertEntity>)

    @Query("UPDATE alerts SET acknowledged = 1 WHERE id = :id")
    suspend fun acknowledge(id: String)
}

@Dao
interface RiskScoreDao {
    @Query("SELECT * FROM risk_scores ORDER BY updatedAt DESC LIMIT 50")
    fun history(): Flow<List<RiskScoreEntity>>

    @Insert
    suspend fun insert(score: RiskScoreEntity)
}

@Dao
interface NetworkDao {
    @Insert
    suspend fun insert(snapshot: NetworkSnapshotEntity)
}

@Dao
interface AuditDao {
    @Query("SELECT * FROM audit_log ORDER BY createdAt DESC")
    fun stream(): Flow<List<AuditLogEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(events: List<AuditLogEntity>)
}

@Database(
    entities = [AlertEntity::class, RiskScoreEntity::class, NetworkSnapshotEntity::class, AuditLogEntity::class],
    version = 1,
    exportSchema = false
)
abstract class SentinelDatabase : RoomDatabase() {
    abstract fun alerts(): AlertDao
    abstract fun riskScores(): RiskScoreDao
    abstract fun network(): NetworkDao
    abstract fun audit(): AuditDao

    companion object {
        fun create(context: Context): SentinelDatabase = Room.databaseBuilder(
            context.applicationContext,
            SentinelDatabase::class.java,
            "sentinel_local.db"
        ).fallbackToDestructiveMigration().build()
    }
}

fun AlertEntity.toModel(): SentinelAlert = SentinelAlert(
    id = id,
    severity = AlertSeverity.valueOf(severity),
    title = title,
    description = description,
    source = source,
    evidenceIds = emptyList(),
    createdAt = createdAt,
    acknowledged = acknowledged
)
