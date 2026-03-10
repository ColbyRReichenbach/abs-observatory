export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-12 lg:py-24">
      <div className="mb-6 h-9 w-28 rounded-full bg-gray-100 animate-pulse" />

      <section className="mb-12 rounded-[3rem] border border-gray-100 bg-white p-12 shadow-2xl shadow-black/[0.03]">
        <div className="flex flex-col gap-8 md:flex-row md:items-center">
          <div className="h-40 w-40 rounded-full bg-gray-100 animate-pulse" />
          <div className="flex-1">
            <div className="h-6 w-24 rounded bg-gray-100 animate-pulse" />
            <div className="mt-5 h-20 w-2/3 rounded bg-gray-100 animate-pulse" />
            <div className="mt-4 h-6 w-1/2 rounded bg-gray-100 animate-pulse" />
          </div>
        </div>
      </section>

      <section className="grid gap-6 grid-cols-2 lg:grid-cols-5 mb-12">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="panel p-8 min-h-[150px]">
            <div className="h-3 w-24 rounded bg-gray-100 animate-pulse" />
            <div className="mt-6 h-12 w-20 rounded bg-gray-100 animate-pulse" />
          </div>
        ))}
      </section>

      <section className="grid gap-8 lg:grid-cols-3">
        <div className="panel p-8 min-h-[320px] lg:col-span-1">
          <div className="h-4 w-24 rounded bg-gray-100 animate-pulse mb-4" />
          <div className="h-[240px] rounded-[1.5rem] bg-gradient-to-br from-gray-100 via-gray-50 to-white animate-pulse" />
        </div>
        <div className="panel p-8 min-h-[320px] lg:col-span-2">
          <div className="h-4 w-24 rounded bg-gray-100 animate-pulse mb-4" />
          <div className="h-[240px] rounded-[1.5rem] bg-gradient-to-br from-gray-100 via-gray-50 to-white animate-pulse" />
        </div>
      </section>
    </main>
  );
}
