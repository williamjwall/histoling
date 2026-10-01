export interface Lang {
  name: string;
  /** English Wikipedia article title. */
  wiki?: string;
  /** Approximate native (L1) speakers, in millions. */
  speakers?: number;
  era?: string;
  extinct?: boolean;
  region?: string;
  note?: string;
  children?: Lang[];
}
