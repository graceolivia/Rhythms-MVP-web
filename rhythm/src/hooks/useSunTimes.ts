import { useState, useEffect } from 'react';
import SunCalc from 'suncalc';

interface SunTimesResult {
  sunrise: Date;
  sunset: Date;
  isLoading: boolean;
  error: string | null;
  usingFallback: boolean;
}

const DEFAULT_SUNRISE_HOUR = 7;
const DEFAULT_SUNSET_HOUR = 19;

function getDefaultSunTimes(): { sunrise: Date; sunset: Date } {
  const today = new Date();

  const sunrise = new Date(today);
  sunrise.setHours(DEFAULT_SUNRISE_HOUR, 0, 0, 0);

  const sunset = new Date(today);
  sunset.setHours(DEFAULT_SUNSET_HOUR, 0, 0, 0);

  return { sunrise, sunset };
}

export function useSunTimes(): SunTimesResult {
  const [sunrise, setSunrise] = useState<Date>(() => getDefaultSunTimes().sunrise);
  const [sunset, setSunset] = useState<Date>(() => getDefaultSunTimes().sunset);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchSunTimes() {
      // Check if geolocation is available
      if (!navigator.geolocation) {
        if (!cancelled) {
          setUsingFallback(true);
          setError('Geolocation not supported');
          setIsLoading(false);
        }
        return;
      }

      try {
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 10000,
              maximumAge: 3600000, // Cache for 1 hour
            });
          }
        );

        if (cancelled) return;

        const { latitude, longitude } = position.coords;
        const today = new Date();
        const times = SunCalc.getTimes(today, latitude, longitude);

        setSunrise(times.sunrise);
        setSunset(times.sunset);
        setUsingFallback(false);
        setError(null);
      } catch (err) {
        if (cancelled) return;

        // Use fallback times
        const defaults = getDefaultSunTimes();
        setSunrise(defaults.sunrise);
        setSunset(defaults.sunset);
        setUsingFallback(true);

        if (err instanceof GeolocationPositionError) {
          switch (err.code) {
            case err.PERMISSION_DENIED:
              setError('Location permission denied');
              break;
            case err.POSITION_UNAVAILABLE:
              setError('Location unavailable');
              break;
            case err.TIMEOUT:
              setError('Location request timed out');
              break;
            default:
              setError('Failed to get location');
          }
        } else {
          setError('Failed to calculate sun times');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchSunTimes();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    sunrise,
    sunset,
    isLoading,
    error,
    usingFallback,
  };
}
