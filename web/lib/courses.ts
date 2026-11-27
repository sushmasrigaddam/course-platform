import { NextResponse } from "next/server";

export async function Categories() {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiBaseUrl) {
        return NextResponse.json({ message: "NEXT_PUBLIC_API_URL is not configured." }, { status: 500 });
    }
    const categories = await fetch(`${apiBaseUrl.replace(/\/+$/, "")}/categories`);
    if (!categories.ok) {
        return NextResponse.json({ message: `Failed to fetch categories (${categories.status}).` }, { status: categories.status });
    }
    const categoriesData = await categories.json();
    return NextResponse.json(categoriesData);
}
export async function Courses() {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiBaseUrl) {
        return NextResponse.json({ message: "NEXT_PUBLIC_API_URL is not configured." }, { status: 500 });
    }
    const courses = await fetch(`${apiBaseUrl.replace(/\/+$/, "")}/courses`);
    if (!courses.ok) {
        return NextResponse.json({ message: `Failed to fetch courses (${courses.status}).` }, { status: courses.status });
    }
    const coursesData = await courses.json();
    return NextResponse.json(coursesData);
}   