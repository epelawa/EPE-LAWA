import { BusinessCardSkeleton } from "../../components/business/business-ui";
import styles from "./directory.module.css";

export default function Loading() {
  return <div className={`${styles.page} page-full-bleed`}>
    <section className={styles.hero} aria-labelledby="directory-loading-title">
      <div className={styles.container}>
        <h1 id="directory-loading-title">Discover Local Businesses</h1>
        <p className={styles.lede}>Find trusted services, businesses and organisations around Epe.</p>
      </div>
    </section>
    <div className={styles.container}>
      <section className={styles.section}>
        <p role="status" aria-live="polite" className={styles.sectionHead}>Loading businesses…</p>
        <div className={styles.grid}>{[1, 2, 3].map((i) => <BusinessCardSkeleton key={i} />)}</div>
      </section>
    </div>
  </div>;
}
