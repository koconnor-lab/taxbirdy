"use client";

import { useState, useEffect, useCallback } from "react";

interface GpsState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  lastUpdated: Date | null;
}

interface LocationInfo {
  locality: string | null;
  state: string | null;
  country: string | null;
}

export default function Home() {
  const [gps, setGps] = useState<GpsState>({
    latitude: null,
    longitude: null,
    error: null,
    lastUpdated: null,
  });
  const [location, setLocation] = useState<LocationInfo>({
    locality: null,
    state: null,
    country: null,
  });

  const reverseGeocode = useCallback(async (lat: number, lon: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      const addr = data.address;
      setLocation({
        locality: addr.city || addr.town || addr.village || addr.hamlet || null,
        state: addr.state || null,
        country: addr.country || null,
      });
    } catch {
      setLocation({ locality: null, state: null, country: null });
    }
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGps((prev) => ({ ...prev, error: "Geolocation is not supported by this browser." }));
      return;
    }

    function updatePosition() {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setGps({
            latitude,
            longitude,
            error: null,
            lastUpdated: new Date(),
          });
          reverseGeocode(latitude, longitude);
        },
        (err) => {
          setGps((prev) => ({ ...prev, error: err.message, lastUpdated: new Date() }));
        },
        { enableHighAccuracy: true }
      );
    }

    updatePosition();
    const interval = setInterval(updatePosition, 10000);
    return () => clearInterval(interval);
  }, [reverseGeocode]);

  const locationParts = [location.locality, location.state, location.country].filter(Boolean);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-col items-center gap-8 p-8">
        <h1 className="text-4xl font-bold text-black dark:text-white">TaxBirdy</h1>
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-700 dark:text-zinc-300">
            GPS Coordinates
          </h2>
          {gps.error ? (
            <p className="text-red-500">{gps.error}</p>
          ) : gps.latitude !== null ? (
            <div className="flex flex-col gap-2 text-center">
              <p className="text-3xl font-mono text-black dark:text-white">
                {gps.latitude.toFixed(6)}°, {gps.longitude!.toFixed(6)}°
              </p>
              {locationParts.length > 0 && (
                <p className="text-xl text-zinc-700 dark:text-zinc-300">
                  {locationParts.join(", ")}
                </p>
              )}
              <p className="text-sm text-zinc-500">
                Last updated: {gps.lastUpdated?.toLocaleTimeString()}
              </p>
              <p className="text-xs text-zinc-400">Refreshes every 10 seconds</p>
            </div>
          ) : (
            <p className="text-zinc-500">Requesting location...</p>
          )}
        </div>
      </main>
    </div>
  );
}
