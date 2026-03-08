package com.taxbirdy.app

data class LocationEntry(
    val latitude: Double,
    val longitude: Double,
    val address: String? = null,
    val locality: String? = null,
    val state: String? = null,
    val country: String? = null,
    val timestamp: Long = System.currentTimeMillis()
)
