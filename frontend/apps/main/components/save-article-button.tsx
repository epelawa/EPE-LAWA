import { toggleSavedArticle } from "../app/dashboard/saved-actions";
import { BookmarkIcon } from "./icons";

/**
 * Save/unsave control for a published story. Rendered as a plain form so it
 * works before hydration; the server action revalidates the member dashboard.
 */
export default function SaveArticleButton({
  articleId,
  slug,
  saved,
  className,
}: {
  articleId: string;
  slug: string;
  saved: boolean;
  className?: string;
}) {
  return (
    <form action={toggleSavedArticle} className={className}>
      <input type="hidden" name="articleId" value={articleId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="intent" value={saved ? "remove" : "save"} />
      <button type="submit" aria-pressed={saved} title={saved ? "Remove from saved stories" : "Save this story"}>
        <BookmarkIcon size={18} filled={saved} />
        <span className="sr-only">{saved ? "Remove from saved stories" : "Save this story"}</span>
      </button>
    </form>
  );
}
