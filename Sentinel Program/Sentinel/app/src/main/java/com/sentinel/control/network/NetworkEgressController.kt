package com.sentinel.control.network

import android.content.Context
import android.net.VpnManager
import android.os.ParcelFileDescriptor
import com.sentinel.control.logging.SentinelLogger
import java.io.File

class NetworkEgressController(private val context: Context) {

    fun enforceVpn(profile: File) {
        SentinelLogger.info("Applying VPN profile from ${'$'}profile")
        // Placeholder for VPN enforcement.
    }

    fun blockEgress() {
        SentinelLogger.warn("Blocking all network egress")
    }
}
