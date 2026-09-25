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
