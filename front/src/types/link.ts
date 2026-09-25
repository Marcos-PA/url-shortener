export interface Link {
  id: number;
  url: string;
  code: string;
  clicks: number;
  short_url: string;
}

export type LinkInput = Omit<Link, "id" | "code" | "clicks" | "short_url"> & {
  personal_link: string | null;
};

/** Public ranking entry: no id, no owner. */
export type LinkPublic = Omit<Link, "id">;
