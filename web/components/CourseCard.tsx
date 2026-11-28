import Link from 'next/link';

export function CourseCard({ course }: { course: any }) {
    const apiOrigin = process.env.NEXT_PUBLIC_API_URL
        ?.replace(/\/api\/v1\/?$/, '')
        .replace(/\/+$/, '');
    const thumbnailUrl = `${apiOrigin}${course.thumbnailUrl}`;

    return (
        <div className="border border-gray-300 p-3 rounded-lg w-full hover:bg-gray-100 bg-white shadow-md">
            <div className="relative mb-4">
                <img
                    src={thumbnailUrl}
                    alt={course.title}
                    className="w-full h-30 object-cover rounded-md"
                />
                <span className="absolute bottom-2 left-2 text-sm text-white">
                    {course.category?.name}
                </span>
            </div>
            <h4 className="text-sm font-semibold bg-[#e6e5ff] text-[#5350c6] py-1 px-2 rounded w-fit">
                {course.level}
            </h4>
            <span>{course.slug}</span>
            <h3 className="text-[16px] font-semibold my-2">{course.title}</h3>
            <p className="text-gray-400 mb-4 text-sm"> by {course.instructor.name}</p>
            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800">{course.price == 0 ? 'Free' : `₹ ${course.price}`}</span>
                <Link href={`/courses/${course.slug}`} className="bg-[#3B38D0] text-white font-semibold text-sm py-1 px-4 rounded ml-2">
                    View Course
                </Link>
            </div>
        </div>
    );
}
