import { Droplets, Landmark, MapPin, Mountain, Soup, TreePalm, type LucideProps } from "lucide-react";

// Icons belong to the UI, not the database, so they are matched by category slug here.
// A new category without an icon gets a map pin.
export function CategoryIcon({ slug, ...props }: { slug: string } & LucideProps) {
  switch (slug) {
    case "temples":
      return <Landmark {...props} />;
    case "waterfalls":
      return <Droplets {...props} />;
    case "beaches":
      return <TreePalm {...props} />;
    case "mountains":
      return <Mountain {...props} />;
    case "food":
      return <Soup {...props} />;
    default:
      return <MapPin {...props} />;
  }
}
