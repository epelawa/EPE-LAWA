import Link from "next/link";
import { ImageIcon } from "../../components/icons";
import { EmptyPanel, PageFrame, PageIntro } from "../../components/design-system";

export const metadata = { title: "Gallery", description: "A source-credited visual archive of Epe." };

export default function GalleryPage() {
  return <PageFrame>
    <PageIntro eyebrow="The visual archive" title="Epe, through a local lens." description="Photographs from across Epe, published with a credit and source for every image." meta={<span>No public photographs</span>} />
    <EmptyPanel icon={<ImageIcon size={24} />} title="No photographs have been published" description="Images appear here only after they have been licensed, sourced and credited. We do not fill the archive with unverified or unlicensed material." actions={<Link href="/tourism" className="btn-secondary">Explore places in Epe</Link>} />
  </PageFrame>;
}
