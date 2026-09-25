export interface Link {
  id: number;
  url: string;
  code: string;
  clicks: number;
}

export type LinkInput = Omit<Link, "id" | "code" | "clicks">;
