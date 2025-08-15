import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-3xl font-bold mb-4">Welcome to Socket Chat</h1>
      <Link href="/chat" className="bg-blue-500 text-white px-4 py-2 rounded">
        Go to Chat
      </Link>
    </div>
  );
}
