package com.sentinel.control.logging

import android.util.Log

object SentinelLogger {
    private const val TAG = "Sentinel"

    fun info(message: String) {
        Log.i(TAG, message)
    }

    fun warn(message: String) {
        Log.w(TAG, message)
    }

    fun error(message: String, throwable: Throwable? = null) {
        Log.e(TAG, message, throwable)
    }
}
