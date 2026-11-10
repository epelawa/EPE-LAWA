import Link from "next/link";
import { ArrowRightIcon, ArrowUpRightIcon, NewspaperIcon, BuildingIcon, UsersIcon } from "../components/icons";
import { EmptyPanel } from "../components/design-system";
import { formatPublishedDate } from "../lib/dates";
import { getLatestStories } from "../lib/home-data";
import "./hero-logo.css";
import CookieBanner from "../components/cookie-banner";

const modules = [
  {name:"Trending News",href:"/news",description:"Local reporting. The stories that matter here."},
  {name:"Ìtàn Ilú Mi",href:"/itan-ilu-mi",description:"Community history, kept with care."},
  {name:"Chat Forum",href:"/forum",description:"A thoughtful space for local conversation."},
  {name:"Map & Navigation",href:"/map",description:"Useful places and your next direction."},
  {name:"Epe Business Directory & Marketplace",href:"/business-directory",description:"Discover the people building local business."},
  {name:"Historical Sites & Tourism",href:"/tourism",description:"Heritage, places and reasons to explore."},
  {name:"EPE LAWA Radio",href:"/radio",description:"Programmes, schedules and community voices."},
  {name:"Who is Who in Epe",href:"/who-is-who",description:"The people and public roles shaping Epe."},
];

export default async function Home() {
  const stories = await getLatestStories(3);
  return <div className="public-home">
    <section className="home-hero" aria-labelledby="home-title"><div className="ep-container home-hero__grid">
      <div className="home-hero__copy"><p className="ui-eyebrow">Epe Division, Lagos State</p><h1 id="home-title">The place.<br />The people.<br /><em>Our Epe.</em></h1><p className="home-hero__lede">A shared home for the stories, conversations and everyday discoveries that bring Epe together.</p><div className="ui-actions"><Link href="/news" className="btn-primary">Discover what’s happening <ArrowRightIcon size={17} aria-hidden="true" /></Link><Link href="/itan-ilu-mi" className="ui-text-link">Know our story <ArrowUpRightIcon size={17} aria-hidden="true" /></Link></div><p className="home-hero__note"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg>Rooted in the community. Open to everyone.</p></div>
      <figure className="home-hero__art home-hero__art--logo"><img src="/brand-logo.png" alt="EPE LAWA — The Voice of Epe Division" width="1348" height="1167" fetchPriority="high" /><figcaption><span><strong>Our place. Our identity.</strong>The voice of Epe Division.</span><ArrowUpRightIcon size={20} aria-hidden="true" /></figcaption></figure>
    </div></section>
    <div className="ep-container home-topics" aria-label="A platform for community life"><span>Stories worth knowing</span><span>History worth keeping</span><span>Places worth finding</span><span>People worth connecting</span></div>

    <section className="ep-container home-section" aria-labelledby="start-title"><div className="home-section__head"><div><p className="ui-eyebrow">Start somewhere familiar</p><h2 id="start-title">Closer to the things<br />that make us, us.</h2></div><p>Catch up on local life, trace the stories before us, or find a business around the corner. There’s more than one way to belong.</p></div><div className="home-features">
      <Link className="home-feature" href="/news"><span className="home-feature__icon"><NewspaperIcon size={20}/></span><h3>Read the room.</h3><p>News and perspectives from across Epe Division.</p><span className="home-feature__arrow" aria-hidden="true"><ArrowUpRightIcon size={20}/></span></Link>
      <Link className="home-feature home-feature--soft" href="/itan-ilu-mi"><span className="home-feature__icon"><UsersIcon size={20}/></span><h3>Remember our roots.</h3><p>Explore Ìtàn Ilú Mi—our communities, culture and shared history.</p><span className="home-feature__arrow" aria-hidden="true"><ArrowUpRightIcon size={20}/></span></Link>
      <Link className="home-feature home-feature--accent" href="/business-directory"><span className="home-feature__icon"><BuildingIcon size={20}/></span><h3>Keep it local.</h3><p>Find businesses, browse products and make useful connections.</p><span className="home-feature__arrow" aria-hidden="true"><ArrowUpRightIcon size={20}/></span></Link>
    </div></section>

    <section className="ep-container home-index" aria-labelledby="explore-title"><div className="home-section__head"><div><p className="ui-eyebrow">The community index</p><h2 id="explore-title">All of Epe.<br />A little closer.</h2></div><p>Eight ways into community life. Follow your curiosity, find what you need, and come back for what’s next.</p></div><ol className="home-index__list">{modules.map((item,i)=><li key={item.href}><Link className="home-index__link" href={item.href}><span className="ui-number">{String(i+1).padStart(2,"0")}</span><div><h3>{item.name}</h3><p>{item.description}</p></div><ArrowUpRightIcon size={18} aria-hidden="true" /></Link></li>)}</ol></section>

    <section className="ep-container home-section home-news" aria-labelledby="latest-title"><div className="home-news__intro"><p className="ui-eyebrow">From the newsroom</p><h2 id="latest-title">Here’s the latest.</h2><p>Reporting published by EPE LAWA. No filler, just the stories available now.</p><Link className="ui-text-link" href="/news">All news <ArrowRightIcon size={17} aria-hidden="true" /></Link></div><div>{stories.state === "ok" && stories.items.length ? <ul className="ui-list">{stories.items.map(story=><li key={story.slug}><Link className="home-story" href={`/news/${story.slug}`}><span className="ui-meta">{story.category}{story.category && story.publishedAt ? " · " : ""}{formatPublishedDate(story.publishedAt)}</span><h3>{story.title}</h3>{story.summary ? <p>{story.summary}</p> : null}<ArrowUpRightIcon size={18} aria-hidden="true" /></Link></li>)}</ul> : <EmptyPanel title={stories.state === "ok" ? "The next story starts here." : "The newsroom is taking a moment."} description={stories.state === "ok" ? "No stories have been published yet. New reporting will appear here as it is published." : "Stories could not be loaded right now. You can still visit the news page and try again."} actions={<Link href="/news" className="btn-secondary">Visit the newsroom</Link>} />}</div></section>

    <section className="ep-container home-section home-community" aria-labelledby="community-title"><div className="home-community__poster" aria-hidden="true"><span>Our place. Our voices.</span><p>Good things<br />begin with<br /><em>connection.</em></p><UsersIcon size={42}/></div><div className="home-community__copy"><p className="ui-eyebrow">A place to take part</p><h2 id="community-title">Not just a place to read.<br />A place to belong.</h2><p>Ask a question, add a perspective, share a memory, or put your business on the map. EPE LAWA makes room for the people behind the place.</p><div className="ui-actions"><Link className="btn-primary" href="/forum">Join the conversation <ArrowRightIcon size={17} aria-hidden="true" /></Link><Link className="ui-text-link" href="/guidelines">Our community guidelines</Link></div></div></section>

    <section className="ep-container home-join" aria-labelledby="join-title"><p className="ui-eyebrow">There’s a place for you here</p><h2 id="join-title">Stay connected.<br />Make it your community.</h2><p>Create a member account to take part in conversations and contribute to the growing story of Epe.</p><div className="ui-actions"><Link className="btn-primary" href="/auth">Become a member <ArrowUpRightIcon size={17} aria-hidden="true" /></Link><Link className="btn-ghost" href="/about">Get to know EPE LAWA</Link></div></section>
    <CookieBanner />
  </div>;
}
