package com.taxbirdy.app

import android.annotation.SuppressLint
import android.app.Application
import android.os.Looper
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.google.android.gms.location.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject

class LocationViewModel(application: Application) : AndroidViewModel(application) {

    private val fusedLocationClient = LocationServices.getFusedLocationProviderClient(application)
    private val httpClient = OkHttpClient()

    private val _entries = MutableStateFlow<List<LocationEntry>>(emptyList())
    val entries: StateFlow<List<LocationEntry>> = _entries

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    private val _isTracking = MutableStateFlow(false)
    val isTracking: StateFlow<Boolean> = _isTracking

    private var locationCallback: LocationCallback? = null

    companion object {
        private const val MAX_ENTRIES = 100
        private const val INTERVAL_MS = 10_000L
    }

    @SuppressLint("MissingPermission")
    fun startTracking() {
        if (_isTracking.value) return
        _isTracking.value = true

        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, INTERVAL_MS)
            .setMinUpdateIntervalMillis(INTERVAL_MS)
            .setMaxUpdateDelayMillis(INTERVAL_MS)
            .setWaitForAccurateLocation(true)
            .build()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                val location = result.lastLocation ?: return
                _error.value = null
                addEntry(location.latitude, location.longitude)
            }
        }

        fusedLocationClient.requestLocationUpdates(
            request,
            locationCallback!!,
            Looper.getMainLooper()
        )
    }

    fun stopTracking() {
        locationCallback?.let { fusedLocationClient.removeLocationUpdates(it) }
        locationCallback = null
        _isTracking.value = false
    }

    private fun addEntry(lat: Double, lon: Double) {
        val entry = LocationEntry(latitude = lat, longitude = lon)
        _entries.value = (listOf(entry) + _entries.value).take(MAX_ENTRIES)

        viewModelScope.launch(Dispatchers.IO) {
            reverseGeocode(lat, lon)?.let { geocoded ->
                _entries.value = _entries.value.map {
                    if (it === entry) geocoded else it
                }
            }
        }
    }

    private fun reverseGeocode(lat: Double, lon: Double): LocationEntry? {
        return try {
            val url = "https://nominatim.openstreetmap.org/reverse?lat=$lat&lon=$lon&format=json&addressdetails=1"
            val request = Request.Builder()
                .url(url)
                .header("User-Agent", "TaxBirdy/1.0")
                .header("Accept-Language", "en")
                .build()

            val response = httpClient.newCall(request).execute()
            val json = JSONObject(response.body?.string() ?: return null)
            val addr = json.optJSONObject("address")

            LocationEntry(
                latitude = lat,
                longitude = lon,
                address = json.optString("display_name", null),
                locality = addr?.optString("city")?.takeIf { it.isNotEmpty() }
                    ?: addr?.optString("town")?.takeIf { it.isNotEmpty() }
                    ?: addr?.optString("village")?.takeIf { it.isNotEmpty() }
                    ?: addr?.optString("hamlet")?.takeIf { it.isNotEmpty() },
                state = addr?.optString("state")?.takeIf { it.isNotEmpty() },
                country = addr?.optString("country")?.takeIf { it.isNotEmpty() }
            )
        } catch (_: Exception) {
            null
        }
    }

    override fun onCleared() {
        super.onCleared()
        stopTracking()
    }
}
