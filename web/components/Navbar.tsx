import Link from 'next/link';

export default function Navbar() {
    return (
        <nav className="bg-white shadow-md sticky top-0 z-50 p-4">
            <div className="container mx-auto flex items-center justify-between">
                <div className="flex items-center space-x-8">
                    <div className="text-blue-900 font-bold text-xl">Learnly</div>
                    <div className="space-x-4">
                        <Link href="/" className="text-black-300 hover:text-white">
                            Home
                        </Link>
                        <Link href="/courses" className="text-black-300 hover:text-white">
                            Courses
                        </Link>
                        <Link href="/about" className="text-black-300 hover:text-white">
                            About
                        </Link>
                        <Link href="/contact" className="text-black-300 hover:text-white">
                            Contact
                        </Link>
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                    <Link href="/login" className="bg-white border border-gray-300 text-gray-800 hover:bg-gray-50 px-4 py-2 rounded-md text-sm font-medium transition-colors">Sign in</Link>
                    <Link href="/signup" className="bg-[#3B38D0] hover:bg-[#2F2CB0] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">Sign up</Link>
                </div>
            </div>
        </nav>
    );
}