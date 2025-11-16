package com.altproductionlabs.sentinellite

import android.os.Bundle
import android.view.View
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.fragment.app.Fragment

class SecurityFragment : Fragment(R.layout.fragment_security) {

    data class SecurityItem(
        val iconRes: Int,
        val title: String,
        val subtitle: String
    )

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val list = view.findViewById<LinearLayout>(R.id.security_list)

        val items = listOf(
            SecurityItem(R.drawable.ic_vpn, "VPN & Tunnels", "Meshnet, Nord, dedicated exit nodes"),
            SecurityItem(R.drawable.ic_wifi_lock, "Network Monitoring", "On-device traffic, Wi-Fi posture"),
            SecurityItem(R.drawable.ic_key, "MFA & Keys", "NFC, YubiKey, chip cards"),
            SecurityItem(R.drawable.ic_sentinel_head, "Sentinel Status", "Local agent and cluster health"),
            SecurityItem(R.drawable.ic_close, "Isolation Console", "Manual kill-switches and lockdowns"),
            SecurityItem(R.drawable.ic_settings_gear, "System Logs", "App, OS and Sentinel logs"),
            SecurityItem(R.drawable.ic_shield, "Evidence Vault", "Tamper-evident artifacts"),
            SecurityItem(R.drawable.ic_shield, "Policy Viewer", "Effective rules and overrides"),
            SecurityItem(R.drawable.ic_settings_gear, "Settings", "App preferences and lab endpoints")
        )

        items.forEach { item ->
            val card = layoutInflater.inflate(R.layout.view_security_card, list, false)
            card.findViewById<ImageView>(R.id.security_icon).setImageResource(item.iconRes)
            card.findViewById<TextView>(R.id.security_title).text = item.title
            card.findViewById<TextView>(R.id.security_subtitle).text = item.subtitle
            list.addView(card)

            // later we'll add click listeners here to open the dedicated fragments
        }
    }
}
