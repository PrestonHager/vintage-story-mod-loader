export interface ModInfo {
  modid: string;
  name: string;
  version: string;
  description?: string;
  authors: string[];
  website?: string;
  side?: string;
  requiredonclient?: boolean;
  requiredonserver?: boolean;
  dependencies?: any;
}

export interface Mod {
  id: string;
  name: string;
  version: string;
  path: string;
  enabled: boolean;
  info?: ModInfo;
  is_zip?: boolean;
}

export interface ModDatabaseMod {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  download_url?: string;
  thumbnail_url?: string;
  category?: string;
  tags: string[];
}

export interface ModSearchResult {
  mods: ModDatabaseMod[];
  total: number;
  page: number;
  per_page: number;
}

export interface ModPackMod {
  id: string;
  version: string;
  url?: string; // Optional URL to download the mod directly
  hash?: string; // SHA256 hash of the mod file for verification
}

export interface ModPackLinks {
  homepage?: string;
  trailer?: string;
  source?: string;
  issues?: string;
  wiki?: string;
  donate?: string;
}

export interface ModPackMetadata {
  category?: string;
  tags?: string[];
  screenshots?: string[];
  status?: "Draft" | "Published";
  url_alias?: string;
  summary?: string;
  text?: string;
  links?: ModPackLinks;
  side?: "Client and Server side mod" | "Server side only mod" | "Client side only mod";
  moddb_logo?: string;
  external_logo?: string;
  thumbnail?: string;
}

export interface ModPack {
  name: string;
  version: string;
  description: string;
  mods: ModPackMod[];
  metadata: ModPackMetadata;
}
