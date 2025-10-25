export interface ImportItem {
  brand: string;
  model?: string;
  year?: string;
  engine?: string;
  fuel?: string;
  origHk?: number;
  tunedHk?: number;
  origNm?: number;
  tunedNm?: number;
  price?: number;
}

export interface ImportResult {
  brand: string;
  model?: string;
  year?: string;
  engine?: string;
  status: "created" | "exists" | "error";
  action?: string;
  message?: string;
}

export interface ImportSummary {
  total: number;
  created: number;
  exists: number;
  errors: number;
}

export interface ImportResponse {
  message: string;
  summary: ImportSummary;
  results: ImportResult[];
}
