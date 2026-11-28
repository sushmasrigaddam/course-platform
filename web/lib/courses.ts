import type { CourseQuery } from '../types';

export async function Categories() {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiBaseUrl) {
        throw new Error("NEXT_PUBLIC_API_URL is not configured.");
    }
    return fetch(`${apiBaseUrl.replace(/\/+$/, "")}/categories`);
}
export async function Courses({
    q = "",
    category = "",
    sort = "asc",
    page = 1,
    limit = 10,
    signal,
}: CourseQuery = {}) {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiBaseUrl) {
        throw new Error("NEXT_PUBLIC_API_URL is not configured.");
    }

    const query = new URLSearchParams({
        sort,
        page: String(page),
        limit: String(limit),
    });
    if (q.trim()) query.set("q", q.trim());
    if (category) query.set("category", category);

    return fetch(`${apiBaseUrl.replace(/\/+$/, "")}/courses?${query}`, { signal });
}