export interface SettingsTabConfig {
  id: string;
  labelKey: string;
  path: string;
  order: number;
  disabled?: boolean;
  badge?: string;
  roles?: string[];
}

export const settingsTabs: SettingsTabConfig[] = [
  { id: "general", labelKey: "nav.general", path: "", order: 1 },
  { id: "users", labelKey: "nav.users", path: "users", order: 2 },
  { id: "rooms", labelKey: "nav.rooms", path: "rooms", order: 3 },
  { id: "tags", labelKey: "nav.tags", path: "tags", order: 4 },
  { id: "integrations", labelKey: "nav.integrations", path: "integrations", order: 5 },
  { id: "privacy", labelKey: "nav.privacy", path: "privacy", order: 6 },
  { id: "compliance", labelKey: "nav.compliance", path: "compliance", order: 7, roles: ["ADMIN", "OWNER"] },
  { id: "ai", labelKey: "nav.ai", path: "ai", order: 8, roles: ["OWNER"] },
  { id: "billing", labelKey: "nav.billing", path: "billing", order: 9 },
];
