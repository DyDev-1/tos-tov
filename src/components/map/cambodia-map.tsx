"use client";

import dynamic from "next/dynamic";
import type { LeafletMapProps } from "./leaflet-map";

// Leaflet needs the browser (it reads the window), so it loads only there.
// Until it is ready, a soft green block holds the space, so the page does not jump.
const LeafletMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => <div aria-hidden className="size-full animate-pulse rounded-[inherit] bg-tint-sage" />,
});

export function CambodiaMap(props: LeafletMapProps) {
  return <LeafletMap {...props} />;
}

export type { MapMarker } from "./leaflet-map";
