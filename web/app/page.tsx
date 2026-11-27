'use client';
import Navbar from '../components/Navbar';
import {Categories,Courses} from '../lib/courses';
import {useEffect, useState} from 'react';
import { CourseCard } from '../components/CourseCard';

export default function Home() {

  const [categories, setCategories] = useState([]);
  const [categoriesCount, setCategoriesCount] = useState('');
  const [courses, setCourses] = useState([]);
  const [coursesCount, setCoursesCount] = useState(0);

  useEffect(() => {
    async function fetchCategories() {
      const response = await Categories();
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
        console.log('Fetched categories:', data);
        setCategoriesCount(data.length);
      } else {
        console.error('Failed to fetch categories:', response.statusText);
      }
    }

    fetchCategories();
  }, []);

  useEffect(() => {
    async function fetchCourses() {
      const response = await Courses();
      if (response.ok) {
        const data = await response.json();
        setCourses(data.items);
        console.log('Fetched courses:', data);
        setCoursesCount(data.total);
      } else {
        console.error('Failed to fetch courses:', response.statusText);
      }
    }

    fetchCourses();
  }, []);

  return (
    <div>
      <Navbar />
      <div className="container mx-auto px-4 py-8 bg-[#F7F6F3]">
        <div className="flex items-center">
          <div className="w-1/2 p-10">
            <h1 className="text-5xl font-bold mb-4">Learn practical skills,<br /> one lesson at a time</h1>
            <p className="text-xl mb-6">Pick a course,track your progress lesson by lesson and learn  from  working instructors.</p>
            <div className="flex space-x-4">
              <button className="bg-[#3B38D0] text-white font-bold py-2 px-4 rounded">
                Browse Courses
              </button>
              <a href="/signup" className="border border-black text-black font-bold py-2 px-4 rounded">
                Create free account
              </a>
            </div>
          </div>
          <div className="w-1/2">
            <div className="border border-gray-300 p-4 rounded-lg w-3/4 mx-auto bg-white shadow-md">
              <p>Find a Course</p>
              <input type="text" placeholder="Search courses..." className="border border-gray-300 rounded py-2 px-4 my-2 w-full" />
              <div className="flex items-center justify-between mt-4">
                <p>{coursesCount} Courses {categoriesCount} Categories</p>
                <button className="bg-[#3B38D0] text-white font-bold py-2 px-4 rounded">
                  Search
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="mx-8">
          <h2 className="text-3xl font-bold mt-8 mb-4">Browse by Categories</h2>
          <div className="flex flex-wrap gap-4 w-full py-4">
            {categories.map((category: any) => (
              <div key={category.id} className="border border-gray-300 py-2 px-4 hover:bg-gray-100 rounded-xl bg-white shadow-md">
                <h3 className="text-sm font-semibold">{category.name}</h3>
              </div>
            ))}
          </div>
        </div>
        <div className="mx-8">
          <h2 className="text-3xl font-bold mt-8 mb-4">Popular Courses</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full py-4">
            {courses.map((course: any) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
