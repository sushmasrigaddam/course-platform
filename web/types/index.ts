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


export type CourseInfo = {
  id: number;
  title: string;
  slug: string;
  description: string;
  level: string;
  price: number | string;
  thumbnailUrl: string | null;
  status: 'PUBLISHED';
  categoryId: number | null;
  instructorId: number;
  createdAt: string;
  updatedAt: string;
  category: {
    id: number;
    name: string;
    slug: string;
  } | null;
  instructor: {
    name: string;
  };
  sections: Array<{
    id: number;
    title: string;
    position: number;
    courseId: number;
  }>;
  modules: Array<{
    id: number;
    title: string;
    position: number;
    courseId: number;
    lessons: Array<{
      id: number;
      title: string;
      durationMin: number;
      position: number;
    }>;
  }>;
};