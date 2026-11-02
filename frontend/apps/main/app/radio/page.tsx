import Link from "next/link";
import { Container, EmptyState, RadioIcon, buttonClassName } from "@epelawa/ui";
import RadioPlayer from "../../components/radio-player";

/**
 * Radio page.
 *
 * The player is the only live thing here. The schedule and archive render honest empty
 * states — nothing is published yet, and nothing is invented to fill the gap.
 */
export default function RadioPage() {
  return (
    <Container>
      <section className="page-header" aria-labelledby="radio-heading">
        <h1 id="radio-heading" className="page-header__title">
          Radio Lagos 107.5 FM
        </h1>
        <p className="page-header__lede">
          The EPE LAWA programme on Radio Lagos. Press Play to listen. Nothing starts
          automatically, and nothing claims to be live unless it has actually been verified.
        </p>
      </section>

      <RadioPlayer />

      <section className="home-block" aria-labelledby="schedule-heading">
        <div className="home-block__head">
          <h2 id="schedule-heading" className="home-block__title">Schedule</h2>
          <p className="home-block__note">What is on and when, published by the newsroom.</p>
        </div>
        <div className="home-block__body">
          <EmptyState icon={<RadioIcon size={20} />}>
            No programme schedule has been published yet.
          </EmptyState>
        </div>
      </section>

      <section className="home-block" aria-labelledby="archive-heading">
        <div className="home-block__head">
          <h2 id="archive-heading" className="home-block__title">Archive</h2>
          <p className="home-block__note">Past programmes, available on demand.</p>
        </div>
        <div className="home-block__body">
          <EmptyState icon={<RadioIcon size={20} />}>
            No past programmes are available yet.
          </EmptyState>
        </div>
      </section>

      <section className="trust">
        <p className="trust__text">
          Audio plays directly from the broadcaster&rsquo;s stream. EPE LAWA does not relay or
          store the audio, and the stream URL comes from the{" "}
          <Link href="https://fm.puzzofme.com" target="_blank" rel="noopener">
            Naija Radio API catalogue
          </Link>
          . Live status is not yet independently verified, so the player does not show a
          &ldquo;LIVE&rdquo; indicator. It will only appear once a status check has actually
          confirmed the stream is on air.
        </p>
      </section>
    </Container>
  );
}
