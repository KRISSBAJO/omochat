import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f3ea] px-6 py-10 text-charcoal">
      <section className="max-w-xl rounded-[32px] border border-charcoal/10 bg-white px-8 py-10 text-center shadow-[0_20px_60px_rgba(24,18,15,0.08)]">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-graphite/55">
          Omochat
        </p>
        <h1 className="mt-4 text-[2.2rem] font-semibold leading-tight">
          That page could not be found
        </h1>
        <p className="mt-3 text-sm leading-7 text-graphite/68">
          The link may be old, the room may have moved, or this address was never
          part of the workspace.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            className="rounded-full bg-charcoal px-5 py-3 text-sm font-semibold text-cloud transition hover:bg-black"
            href="/"
          >
            Go home
          </Link>
          <Link
            className="rounded-full border border-charcoal/10 bg-[#faf7f2] px-5 py-3 text-sm font-semibold text-charcoal transition hover:bg-white"
            href="/new-shell"
          >
            Open workspace
          </Link>
        </div>
      </section>
    </main>
  );
}
