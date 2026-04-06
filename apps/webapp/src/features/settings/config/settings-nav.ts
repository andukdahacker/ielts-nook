export interface SettingsTabConfig {
  id: string;
  label: string;
  path: string;
  order: number;
  disabled?: boolean;
  badge?: string;
}

export const settingsTabs: SettingsTabConfig[] = [
  { id: "general", label: "General", path: "", order: 1 },
  { id: "users", label: "Users", path: "users", order: 2 },
  { id: "rooms", label: "Rooms", path: "rooms", order: 2.5 },
  { id: "tags", label: "Tags", path: "tags", order: 2.7 },
  { id: "integrations", label: "Integrations", path: "integrations", order: 3 },
  { id: "privacy", label: "Privacy", path: "privacy", order: 4 },
  { id: "ai", label: "AI Customization", path: "ai", order: 4.5 },
  { id: "billing", label: "Billing", path: "billing", order: 5 },
];
