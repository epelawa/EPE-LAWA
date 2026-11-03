import Link from "next/link";
import RadioPlayer from "../../components/radio-player";
import { RadioIcon } from "../../components/icons";

/**
 * Radio page.
 *
 * The player is the only live thing here. The schedule and archive render honest empty
 * states — nothing is published yet, and nothing is invented to fill the gap.
 */
export default function RadioPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          Radio Lagos 107.5 FM
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Radio Lagos 107.5 FM</h1>
        <p className="text-slate-600 mt-2 leading-relaxed">
          The EPE LAWA programme on Radio Lagos. Press Play to listen. Nothing starts
          automatically, and nothing claims to be live unless it has actually been verified.
        </p>
      </div>

      <RadioPlayer />

      <div className="rounded-lg border border-slate-200 bg-white p-6 mt-8">
        <h2 className="text-lg font-bold text-slate-900 mb-2">Schedule</h2>
        <p className="text-slate-600 text-sm mb-4">What is on and when, published by the newsroom.</p>
        <div className="flex items-center justify-center h-32 bg-slate-50 rounded-lg">
          <RadioIcon size={32} className="text-slate-400" />
        </div>
        <p className="mt-2 text-sm font-medium text-slate-500">
          No programme schedule has been published yet.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 mt-6">
        <h2 className="text-lg font-bold text-slate-900 mb-2">Archive</h2>
        <p className="text-slate-600 text-sm mb-4">Past programmes, available on demand.</p>
        <div className="flex items-center justify-center h-32 bg-slate-50 rounded-lg">
          <RadioIcon size={32} className="text-slate-400" />
        </div>
        <p className="mt-2 text-sm font-medium text-slate-500">
          No past programmes are available yet.
        </p>
      </div>

      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6">
        <p className="text-slate-600 text-sm leading-relaxed">
          Audio plays directly from the broadcaster&rsquo;s stream. EPE LAWA does not relay or
          store the audio, and the stream URL comes from the{" "}
          <Link href="https://fm.puzzofme.com" target="_blank" rel="noopener">
            Naija Radio API catalogue
          </Link>
          . Live status is not yet independently verified, so the player does not show a
          &ldquo;LIVE&rdquo; indicator. It will only appear once a status check has actually
          confirmed the stream is on air.
        </p>
      </div>
    </div>
  );
}
