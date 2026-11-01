import {
  Anchor,
  BusFront,
  CloudRain,
  CloudSun,
  Database,
  Landmark,
  Plane,
  Siren,
  TrafficCone,
  Umbrella,
  UtilityPole,
  Waves,
  Wind,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "@/lib/constants";

const CATEGORY_ICONS: Record<Category, LucideIcon> = {
  traffic: TrafficCone,
  weather: CloudSun,
  sea: Waves,
  beach: Umbrella,
  flood: CloudRain,
  air: Wind,
  emergency: Siren,
  mobility: BusFront,
  port: Anchor,
  airport: Plane,
  infrastructure: UtilityPole,
  open_data: Database,
  government: Landmark,
};

export function CategoryIcon({
  category,
  className = "size-4",
}: {
  category: Category;
  className?: string;
}) {
  const Icon = CATEGORY_ICONS[category];
  return <Icon aria-hidden className={className} />;
}
