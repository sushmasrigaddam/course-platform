export type userlogin = {
  email: string;
  password: string;
  name?: string;
};

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: string;
};

export type AuthResponse = {
  message: string;
  token: string;
  user: AuthUser;
};

export type CourseQuery = {
    q?: string;
    category?: string;
    sort?: "asc" | "desc" | "newest";
    page?: number;
    limit?: number;
    signal?: AbortSignal;
};


export type CategorySummary = { id: number; name: string; slug: string };
export type CourseSummary = {
  id: number;
  title: string;
  level: string;
  slug: string;
  thumbnailUrl?: string | null;
  price: number | string;
  category?: CategorySummary | null;
  instructor: { name: string };
};
export type CoursePageResponse = {
  items: CourseSummary[];
  total: number;
};
