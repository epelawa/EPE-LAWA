export default function RadioPlayer() {
  return (
    <section className="rounded-xl border bg-card p-6" aria-labelledby="radio-player-title">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="radio-player-title" className="text-xl font-bold">EPE LAWA Radio</h2>
        <span className="rounded-full border px-3 py-1 text-xs font-semibold" role="status" aria-label="Live streaming status: Coming Soon">Coming Soon</span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground" role="status">
        Live streaming is not yet available. The official stream URL, embedding permission, compatible format and playback have not yet been verified.
      </p>
    </section>
  );
}
