package com.sentinel.control.util

import com.squareup.moshi.JsonAdapter
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import org.json.JSONArray
import org.json.JSONObject

object JsonUtil {
    private val moshi: Moshi = Moshi.Builder().add(KotlinJsonAdapterFactory()).build()

    fun <T> fromJson(json: String, clazz: Class<T>): T {
        val adapter: JsonAdapter<T> = moshi.adapter(clazz)
        return adapter.fromJson(json) ?: throw IllegalArgumentException("Invalid JSON for ${'$'}clazz")
    }

    fun toJson(data: Any): String {
        return when (data) {
            is Map<*, *> -> JSONObject(data).toString()
            is List<*> -> JSONArray(data).toString()
            else -> moshi.adapter(data::class.java).toJson(data)
        }
    }
}
