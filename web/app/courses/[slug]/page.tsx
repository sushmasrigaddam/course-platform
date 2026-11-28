'use client';

import { use, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { CourseDetail } from '../../../lib/courses';
import type { CourseInfo } from '../../../types';

export default function CourseDetails() {
    const { slug } = useParams<{ slug: string }>();
    const [courseInfo, setCourseInfo] = useState<CourseInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [lessons, setLesson] = useState<number>(0);
    const [modules, setModules] = useState<number>(0);
    const totalDuration = courseInfo?.modules.reduce(
        (total, module) => total + module.lessons.reduce((moduleTotal, lesson) => moduleTotal + lesson.durationMin, 0),
        0
    ) ?? 0;
    const apiOrigin = process.env.NEXT_PUBLIC_API_URL
        ?.replace(/\/api\/v1\/?$/, '')
        .replace(/\/+$/, '');
    useEffect(() => {
        const controller = new AbortController();

        async function fetchCourseDetails() {
            setLoading(true);
            setError('');

            try {
                const response = await CourseDetail(slug, controller.signal);
                if (response.status === 404) {
                    throw new Error('Course not found.');
                }
                if (!response.ok) {
                    throw new Error(`Failed to load course (${response.status}).`);
                }
                const data = (await response.json()) as CourseInfo;
                setCourseInfo(data);
                setModules(data.modules.length);
                setLesson(data.modules.reduce((total, module) => total + module.lessons.length, 0));

            } catch (fetchError) {
                if (!controller.signal.aborted) {
                    setError(fetchError instanceof Error ? fetchError.message : 'Failed to load course.');
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }

        if (slug) void fetchCourseDetails();
        return () => controller.abort();
    }, [slug]);

    return (
        <div className="min-h-screen bg-[#F7F6F3]">
            <Navbar />
            <div className='flex p-10'>
                <div className='w-2/3 p-4'>
                    <p className='text-gray-500 text-md mb-2' >Course / {courseInfo?.category?.name} / {courseInfo?.title}</p>
                    <h4 className="text-sm font-semibold bg-[#e6e5ff] text-[#5350c6] py-1 px-2 rounded w-fit my-2">
                        {courseInfo?.level}
                    </h4>
                    <h1 className='text-4xl'>{courseInfo?.title}</h1>
                    <p className='text-md my-3'>{courseInfo?.description}</p>
                    <p>Instructor:<span className='font-bold'>{courseInfo?.instructor?.name} </span>{modules} modules {lessons} lessons {totalDuration} min</p>

                    <div className='my-4'>
                        <h3 className='text-2xl font-bold mb-3'>What you will learn</h3>
                        <ul className='bg-white p-3 shadow rounded flex space-x-4'>
                            {courseInfo?.sections?.map((section) => (
                                <li key={section.id}>{section.title}</li>
                            ))}
                        </ul>
                    </div>
                    <div className='my-4'>
                        <h3 className='text-2xl font-bold mb-3'>Curriculum</h3>
                        {courseInfo?.modules?.map((module) => (
                            <ul key={module.id} className='bg-white shadow p-5 my-6 rounded'>
                                <div className='flex justify-between'>
                                    <p className='font-bold text-xl'>{module.position}. {module.title}</p>
                                    <p>
                                        {module.lessons.length} lessons{' '}
                                        {module.lessons.reduce((total, lesson) => total + lesson.durationMin, 0)} min
                                    </p>
                                </div>
                                {module.lessons?.map((lesson) => (
                                    <li key={lesson.id} className='flex justify-between border-t border-gray-300 pt-2 pb-1 mt-2' >
                                        <p>{lesson.title}</p>
                                        <p className='text-gray'>{lesson.durationMin} min</p>
                                    </li>
                                ))}
                            </ul>
                        ))}
                    </div>

                </div>
                <div className='w-1/3'>
                    <div className='border border-gray-300 p-3 rounded bg-white shadow-md'>
                        <div className="relative mb-3">
                            <img
                                src={`${apiOrigin}${courseInfo?.thumbnailUrl}`}
                                alt={courseInfo?.title}
                                className="w-full h-40 object-cover rounded-md"
                            />
                            <span className="absolute bottom-2 left-2 text-sm text-white">
                                {courseInfo?.category?.name}
                            </span>
                        </div>
                        <h2 className='text-lg'>{courseInfo?.price == 0 ? "Free" : `₹${courseInfo?.price}`}</h2>
                        <button className='bg-[#5350c6] text-white text-md font-bold p-2 w-full rounded-lg'>Enroll Now</button>
                        <button className='border border-black-500 w-full p-2 rounded-lg mt-3'>Start Learning</button>
                        <ul className='p-2'>
                            <li className='flex justify-between border-t py-2 border-gray-300'>Level <span className='font-bold'>{courseInfo?.level}</span></li>
                            <li className='flex justify-between border-t py-2 border-gray-300'>Lessons <span className='font-bold'>{lessons}</span></li>
                            <li className='flex justify-between border-t py-2 border-gray-300'>Access <span className='font-bold'>Full,on any device</span></li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
