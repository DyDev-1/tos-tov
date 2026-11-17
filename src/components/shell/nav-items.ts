import { Compass, Map, Bookmark, type LucideIcon } from "lucide-react";

// The three main places in the app. Shown in the desktop header and the phone tab bar.
// `labelKey` points into messages/*.json (namespace "Header").
export const NAV_ITEMS: { href: "/" | "/map" | "/saved"; labelKey: "explore" | "map" | "saved"; icon: LucideIcon }[] = [
  { href: "/", labelKey: "explore", icon: Compass },
  { href: "/map", labelKey: "map", icon: Map },
  { href: "/saved", labelKey: "saved", icon: Bookmark },
];
