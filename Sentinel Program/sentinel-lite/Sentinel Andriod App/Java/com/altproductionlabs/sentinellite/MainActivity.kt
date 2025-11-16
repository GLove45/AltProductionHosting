package com.altproductionlabs.sentinellite

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import com.google.android.material.appbar.MaterialToolbar
import com.google.android.material.bottomnavigation.BottomNavigationView

class MainActivity : AppCompatActivity() {

    private lateinit var toolbar: MaterialToolbar
    private lateinit var bottomNav: BottomNavigationView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        toolbar = findViewById(R.id.topAppBar)
        bottomNav = findViewById(R.id.bottom_nav)

        bottomNav.setOnItemSelectedListener { item ->
            when (item.itemId) {
                R.id.nav_dashboard -> {
                    switchFragment(DashboardFragment(), "Dashboard")
                    true
                }
                R.id.nav_alerts -> {
                    switchFragment(AlertsFragment(), "Alerts")
                    true
                }
                R.id.nav_nodes -> {
                    switchFragment(NodesFragment(), "Nodes")
                    true
                }
                R.id.nav_playbooks -> {
                    switchFragment(PlaybooksFragment(), "Playbooks")
                    true
                }
                R.id.nav_security -> {
                    switchFragment(SecurityFragment(), "Security Hub")
                    true
                }
                else -> false
            }
        }

        if (savedInstanceState == null) {
            bottomNav.selectedItemId = R.id.nav_dashboard
        }
    }

    private fun switchFragment(fragment: Fragment, title: String) {
        setToolbarTitle(title)
        supportFragmentManager.beginTransaction()
            .replace(R.id.content_container, fragment)
            .commit()
    }

    fun setToolbarTitle(title: String) {
        toolbar.title = "Sentinel Lite – $title"
    }
}
