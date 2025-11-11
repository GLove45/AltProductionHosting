package com.sentinel.control.data

import android.content.Context
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.sentinel.control.network.ApprovalResponse
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import java.time.Instant

private val Context.dataStore by preferencesDataStore(name = "approval_tokens")

class ApprovalTokenStore(private val context: Context) {

    fun saveToken(response: ApprovalResponse) {
        runBlocking {
            context.dataStore.edit { prefs ->
                prefs[TOKEN_KEY] = response.token
                val maxExpiry = Instant.now().plusSeconds(30).toEpochMilli()
                prefs[EXPIRY_KEY] = minOf(response.expiresAt, maxExpiry)
            }
        }
    }

    fun isTokenValid(): Boolean = runBlocking {
        val prefs = context.dataStore.data.first()
        val expiry = prefs[EXPIRY_KEY] ?: return@runBlocking false
        Instant.ofEpochMilli(expiry).isAfter(Instant.now())
    }

    fun clear() {
        runBlocking {
            context.dataStore.edit(Preferences::clear)
        }
    }

    companion object {
        private val TOKEN_KEY = stringPreferencesKey("token")
        private val EXPIRY_KEY = longPreferencesKey("expiry")
    }
}
