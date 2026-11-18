import { UserIcon } from "./icons";
export default function ArticleByline({ name }: { name: string }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: ".3em" }}><UserIcon size={15} /><span className="sr-only">Author: </span><span>{name}</span></span>;
}
