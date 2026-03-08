"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface LocationEntry {
  latitude: number;
  longitude: number;
  address: string | null;
  locality: string | null;
  state: string | null;
  country: string | null;
  timestamp: Date;
}

const MAX_ENTRIES = 100;

export default function Home() {
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<LocationEntry[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  const fetchAndAddEntry = useCallback(async (lat: number, lon: number) => {
    let address: string | null = null;
    let locality: string | null = null;
    let state: string | null = null;
    let country: string | null = null;

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      const addr = data.address;
      address = data.display_name || null;
      locality = addr.city || addr.town || addr.village || addr.hamlet || null;
      state = addr.state || null;
      country = addr.country || null;
    } catch {
      // geocoding failed, coordinates still recorded
    }

    const entry: LocationEntry = {
      latitude: lat,
      longitude: lon,
      address,
      locality,
      state,
      country,
      timestamp: new Date(),
    };

    setEntries((prev) => {
      const updated = [entry, ...prev];
      return updated.slice(0, MAX_ENTRIES);
    });
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }

    function updatePosition() {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setError(null);
          fetchAndAddEntry(position.coords.latitude, position.coords.longitude);
        },
        (err) => {
          setError(err.message);
        },
        { enableHighAccuracy: true }
      );
    }

    updatePosition();
    const interval = setInterval(updatePosition, 10000);
    return () => clearInterval(interval);
  }, [fetchAndAddEntry]);

  const latest = entries[0] ?? null;
  const locationParts = latest
    ? [latest.locality, latest.state, latest.country].filter(Boolean)
    : [];

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-col items-center gap-8 p-8 w-full max-w-2xl">
        <h1 className="text-4xl font-bold text-black dark:text-white">TaxBirdy</h1>

        <div className="w-full rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-700 dark:text-zinc-300">
            Current Location
          </h2>
          {error ? (
            <p className="text-red-500">{error}</p>
          ) : latest ? (
            <div className="flex flex-col gap-2 text-center">
              <p className="text-3xl font-mono text-black dark:text-white">
                {latest.latitude.toFixed(6)}°, {latest.longitude.toFixed(6)}°
              </p>
              {locationParts.length > 0 && (
                <p className="text-xl text-zinc-700 dark:text-zinc-300">
                  {locationParts.join(", ")}
                </p>
              )}
              {latest.address && (
                <p className="text-sm text-zinc-500">{latest.address}</p>
              )}
              <p className="text-xs text-zinc-400">
                {latest.timestamp.toLocaleTimeString()} · Refreshes every 10s
              </p>
            </div>
          ) : (
            <p className="text-zinc-500">Requesting location...</p>
          )}
        </div>

        <div className="w-full rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="px-6 pt-6 pb-2 text-lg font-semibold text-zinc-700 dark:text-zinc-300">
            Location History ({entries.length}/{MAX_ENTRIES})
          </h2>
          <div
            ref={listRef}
            className="max-h-96 overflow-y-auto px-6 pb-6"
          >
            {entries.length === 0 ? (
              <p className="text-zinc-500 text-sm py-2">No entries yet...</p>
            ) : (
              <div className="flex flex-col gap-3">
                {entries.map((entry, i) => {
                  const parts = [entry.locality, entry.state, entry.country].filter(Boolean);
                  return (
                    <div
                      key={i}
                      className="flex flex-col gap-0.5 border-b border-zinc-100 pb-3 last:border-0 dark:border-zinc-800"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm text-black dark:text-white">
                          {entry.latitude.toFixed(6)}°, {entry.longitude.toFixed(6)}°
                        </span>
                        <span className="text-xs text-zinc-400">
                          {entry.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      {parts.length > 0 && (
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">
                          {parts.join(", ")}
                        </span>
                      )}
                      {entry.address && (
                        <span className="text-xs text-zinc-400">{entry.address}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
