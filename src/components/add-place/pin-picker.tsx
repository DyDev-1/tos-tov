"use client";

import { LocateFixed } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CambodiaMap } from "@/components/map/cambodia-map";
import { CAMBODIA_BOUNDS } from "@/lib/validation/place-input";

export type Pin = { lat: number; lng: number };

// Middle of Cambodia: where the pin waits until the person moves it.
export const DEFAULT_PIN: Pin = { lat: 12.5657, lng: 104.991 };

export function isInsideCambodia(pin: Pin) {
  return (
    pin.lat >= CAMBODIA_BOUNDS.minLat &&
    pin.lat <= CAMBODIA_BOUNDS.maxLat &&
    pin.lng >= CAMBODIA_BOUNDS.minLng &&
    pin.lng <= CAMBODIA_BOUNDS.maxLng
  );
}

// Step 4: tap the map or drag the pin. "Use my location" asks the phone where it is.
export function PinPicker({
  pin,
  touched,
  error,
  onChange,
}: {
  pin: Pin;
  touched: boolean;
  error?: string;
  onChange: (pin: Pin) => void;
}) {
  const t = useTranslations("AddPlace.pin");
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(false);

  function useMyLocation() {
    setLocationError(false);
    if (!navigator.geolocation) return setLocationError(true);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        onChange({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      () => {
        setLocating(false);
        setLocationError(true);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  const outside = touched && !isInsideCambodia(pin);

  return (
    <fieldset aria-invalid={!!error} className="space-y-2">
      <legend className="mb-2 font-bold">{t("label")}</legend>
      <div className="relative isolate">
        <CambodiaMap
          label={t("mapLabel")}
          pin={pin}
          pinZoom={touched ? 13 : 7}
          onPinChange={(lat, lng) => onChange({ lat, lng })}
          className="h-72 overflow-hidden rounded-2xl"
        />
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="absolute right-3 bottom-3 z-[500] inline-flex min-h-11 items-center gap-2 rounded-full bg-background px-4 font-semibold text-primary shadow-lg disabled:opacity-60"
        >
          <LocateFixed aria-hidden className="size-4" />
          {locating ? t("locating") : t("useMyLocation")}
        </button>
      </div>
      <p className="text-sm text-muted-foreground">
        {touched ? t("set", { lat: pin.lat.toFixed(5), lng: pin.lng.toFixed(5) }) : t("hint")}
      </p>
      {locationError && (
        <p role="alert" className="text-sm text-destructive">
          {t("locationDenied")}
        </p>
      )}
      {(outside || error) && (
        <p id="pin-error" role="alert" className="text-sm font-semibold text-destructive">
          {outside ? t("outside") : error}
        </p>
      )}
    </fieldset>
  );
}
