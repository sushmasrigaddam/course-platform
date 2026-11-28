'use client';
import Navbar from '../../components/Navbar';
import { Categories, Courses } from '../../lib/courses';
import { useEffect, useState } from 'react';
import { CourseCard } from '../../components/CourseCard';
import type { CategorySummary, CourseSummary, CoursePageResponse } from '../../types';

export default function Home() {

    const [categories, setCategories] = useState<CategorySummary[]>([]);
    const [categoriesCount, setCategoriesCount] = useState(0);
    const [categoriesError, setCategoriesError] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
    const [courses, setCourses] = useState<CourseSummary[]>([]);
    const [coursesCount, setCoursesCount] = useState(0);
    const [coursesError, setCoursesError] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [coursesLoading, setCoursesLoading] = useState(false);


    useEffect(() => {
        async function fetchCategories() {
            try {
                const response = await Categories();
                if (!response.ok) {
                    throw new Error(`Failed to fetch categories (${response.status}).`);
                }
                const data = (await response.json()) as CategorySummary[];
                setCategories(data);
                setCategoriesCount(data.length)
            }
            catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to fetch categories.';
                setCategoriesError(message);
                console.error(message);
            }
        }
        fetchCategories();
    }, [])

    useEffect(() => {
        const controller = new AbortController();
        async function fetchCourses() {
            setCoursesLoading(true);
            setCoursesError('');
            try {
                const response = await Courses({
                    q: searchTerm,
                    sort: sortOrder,
                    category: selectedCategory,
                })
                if (!response.ok) {
                    throw new Error(`Failed to fetch courses (${response.status}).`);
                }
                const data = (await response.json()) as CoursePageResponse;
                setCourses(data.items);
                setCoursesCount(data.total)
            } catch (error) {
                if (!controller.signal.aborted) {
                    setCoursesError(error instanceof Error ? error.message : 'Failed to fetch courses.');
                }
            } finally {
                if (!controller.signal.aborted) setCoursesLoading(false);
            }
        }
        fetchCourses();
        return () => controller.abort();
    }, [searchTerm, selectedCategory, sortOrder])

    return (
        <div>
            <Navbar />
            <div className="container mx-auto px-4 py-8 bg-[#F7F6F3]">
                <div className="flex items-center mx-8">
                    <div className='w-2/3'>
                        <h2 className="text-3xl font-bold mt-8 mb-4">Browse by Categories</h2>
                        <div className='flex  flex-wrap gap-4 w-full py-4'>
                            {categoriesError && <p role="alert" className="text-red-600">{categoriesError}</p>}
                            <button
                                type="button"
                                aria-pressed={!selectedCategory}
                                onClick={() => setSelectedCategory('')}
                                className={`border border-gray-300 py-2 px-4 hover:bg-gray-100 rounded-xl shadow-md ${!selectedCategory ? 'bg-gray-100' : 'bg-white'}`}
                            >
                                All categories
                            </button>
                            {categories.map((category) => (
                                <button
                                    type="button"
                                    key={category.id}
                                    aria-pressed={selectedCategory === category.slug}
                                    onClick={() => setSelectedCategory(category.slug)}
                                    className={`border border-gray-300 py-2 px-4 hover:bg-gray-100 rounded-xl shadow-md ${selectedCategory === category.slug ? 'bg-gray-100' : 'bg-white'}`}
                                >
                                    <h3 className="text-sm font-semibold">{category.name}</h3>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="w-1/3">
                        <form onSubmit={(event) => {
                            event.preventDefault();
                            setSearchTerm(searchInput.trim())
                        }}
                            className="border border-gray-300 p-4 rounded-lg w-3/4 mx-auto bg-white shadow-md">
                            <p>Find the Course</p>
                            <input type='search' value={searchInput}
                                onChange={(event) => setSearchInput(event.target.value)}
                                placeholder="Search course titles..."
                                className="border border-gray-300 rounded py-2 px-4 my-2 w-full" />
                            <div className="flex items-center justify-between mt-4">
                                <div>
                                    <p>{coursesCount} Courses</p>
                                    <p>{categoriesCount} Categories</p>
                                </div>
                                <button type="submit" className="bg-[#3B38D0] text-white font-bold py-2 px-4 rounded">
                                    Search
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
                <div className="mx-8">
                    <div className="mt-8 mb-4 flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-3xl font-bold">Popular Courses</h2>
                        <label className="flex items-center gap-2 text-sm font-medium">
                            Sort by title
                            <select
                                value={sortOrder}
                                onChange={(event) => setSortOrder(event.target.value === 'desc' ? 'desc' : 'asc')}
                                className="rounded border border-gray-300 bg-white px-3 py-2"
                            >
                                <option value="asc">Ascending (A-Z)</option>
                                <option value="desc">Descending (Z-A)</option>
                            </select>
                        </label>
                    </div>
                    {coursesLoading && <p role="status">Loading courses...</p>}
                    {coursesError && <p role="alert" className="text-red-600">{coursesError}</p>}
                    {!coursesLoading && !coursesError && courses.length === 0 && <p>No courses found.</p>}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full py-4">
                        {courses.map((course) => (
                            <CourseCard key={course.id} course={course} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
