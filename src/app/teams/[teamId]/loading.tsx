export default function Loading() {
  return (
    <main className="relative mx-auto max-w-7xl px-6 pt-32 pb-40">
      <div className="mb-6 h-9 w-24 rounded-full bg-gray-100 animate-pulse" />

      <section className="rounded-[2.5rem] border border-gray-100 bg-white px-10 py-16 shadow-2xl shadow-black/[0.03]">
        <div className="h-5 w-24 rounded bg-gray-100 animate-pulse" />
        <div className="mt-5 h-20 w-3/4 rounded bg-gray-100 animate-pulse" />
        <div className="mt-4 h-6 w-1/2 rounded bg-gray-100 animate-pulse" />
      </section>

      <div className="mt-8 flex gap-3">
        <div className="h-10 w-40 rounded-full bg-gray-100 animate-pulse" />
        <div className="h-10 w-32 rounded-full bg-gray-100 animate-pulse" />
      </div>

      <section className="mt-8 grid gap-4 grid-cols-2 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="panel p-6 min-h-[120px]">
            <div className="h-3 w-24 rounded bg-gray-100 animate-pulse" />
            <div className="mt-4 h-10 w-20 rounded bg-gray-100 animate-pulse" />
          </div>
        ))}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="panel p-8 min-h-[360px]">
            <div className="h-4 w-28 rounded bg-gray-100 animate-pulse mb-4" />
            <div className="h-[280px] rounded-[1.5rem] bg-gradient-to-br from-gray-100 via-gray-50 to-white animate-pulse" />
          </div>
        ))}
      </section>
    </main>
  );
}
