import Link from "next/link";
import { ImageIcon } from "../../components/icons";
import { PageFrame, PageIntro, EmptyPanel, StatusBadge } from "../../components/design-system";
export const metadata = { title: "Gallery" };
export default function GalleryPage() { return <PageFrame><PageIntro eyebrow="The visual archive" title="Epe, through a local lens." description="Photographs from across Epe Division, with a credit and a source for every image." meta={<StatusBadge tone="warning">Coming Soon</StatusBadge>}/><EmptyPanel icon={<ImageIcon size={24}/>} title="The archive is being assembled." description="No photographs have been published yet. Images will appear only after they have been licensed, sourced and credited." actions={<Link href="/tourism" className="btn-secondary">Explore places in Epe</Link>}/></PageFrame>; }
