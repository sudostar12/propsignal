export default function Landing() {
  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center text-center p-10">
      <h1 className="text-4xl font-bold mb-4 text-gray-800">
        Welcome to PropSignal
      </h1>
      <p className="text-lg text-gray-600 mb-6 max-w-xl">
        Instantly analyse Australian suburbs for investment potential using AI.
        Backed by local data. Zero cost. No account needed.
      </p>
      <a
        href="/"
        className="bg-blue-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-blue-700 transition"
      >
        Try It Now
      </a>
    </main>
  )
}
