package com.sentinel.control.util

import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

suspend fun awaitBiometric(
    activity: FragmentActivity,
    promptInfo: BiometricPrompt.PromptInfo
) {
    return suspendCancellableCoroutine { cont ->
        val prompt = BiometricPrompt(
            activity,
            ContextCompat.getMainExecutor(activity),
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    if (cont.isActive) {
                        cont.resumeWithException(IllegalStateException("Biometric error: ${'$'}errString"))
                    }
                }

                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    if (cont.isActive) {
                        cont.resume(Unit)
                    }
                }

                override fun onAuthenticationFailed() {
                    if (cont.isActive) {
                        cont.resumeWithException(IllegalStateException("Biometric authentication failed"))
                    }
                }
            }
        )
        prompt.authenticate(promptInfo)
        cont.invokeOnCancellation { prompt.cancelAuthentication() }
    }
}
