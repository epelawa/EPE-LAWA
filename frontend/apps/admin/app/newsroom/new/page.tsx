"use client";

import { useEffect, useState, FormEvent } from "react";
import { createClient } from "../../lib/supabase";
import { Button, Alert, EmptyState, buttonClassName } from "@epelawa/ui";

/**
 * Create a new draft article.
 *
 * Submits through the article_create security definer function, which enforces
 * the article.create capability and revision CAS. The article starts as a draft
 * and is invisible to the public.
 */
export default function NewArticlePage() {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [authorId, setAuthorId] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [ogImageKey, setOgImageKey] = useState("");
  [const error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("article_create", {
        p_title: title,
        p_summary: summary || null,
        p_body: JSON.parse(body || "{}"),
        p_author_id: authorId || null,
        p_category_id: categoryId || null,
        p_seo_title: seoTitle || null,
        p_seo_description: seoDescription || null,
        p_og_image_key: ogImageKey || null,
      });

      if (rpcError) throw rpcError;

      window.location.href = `/newsroom/${data}`;
    } catch (err: any) {
      setError(err.message || "Failed to create draft.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main id="main" className="site-main" tabIndex={-1}>
      <div className="ep-container">
        <div className="page-header">
          <h1 className="page-header__title">New draft</h1>
          <p className="page-header__lede">
            Create a draft article. It will be invisible to the public until
            reviewed, approved, and published by authorised staff.
          </p>
        </div>

        {error && <Alert tone="error" title="Error">{error}</Alert>}

        <form className="form" onSubmit={handleSubmit}>
          <div className="field">
            <label className="field__label" htmlFor="title">Title</label>
            <input
              id="title"
              className="field__control"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article title"
              required
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="summary">Summary</label>
            <textarea
              id="summary"
              className="field__control"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              placeholder="Short summary shown in listings"
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="body">Body (Tiptap JSON)</label>
            <textarea
              id="body"
              className="field__control"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              placeholder='{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Write your article here..."}]}]}'
            />
            <p className="field__hint">Store the article body as Tiptap JSON. A rich-text editor is a future enhancement.</p>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="categoryId">Category</label>
            <input
              id="categoryId"
              className="field__control"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              placeholder="Category UUID (optional)"
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="authorId">Author</label>
            <input
              id="authorId"
              className="field__control"
              value={authorId}
              onChange={(e) => setAuthorId(e.target.value)}
              placeholder="Author UUID (optional)"
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="seoTitle">SEO title</label>
            <input
              id="seoTitle"
              className="field__control"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              placeholder="SEO title"
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="seoDescription">SEO description</label>
            <input
              id="seoDescription"
              className="field__control"
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              placeholder="SEO description"
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="ogImageKey">OG image key</label>
            <input
              id="ogImageKey"
              className="field__control"
              value={ogImageKey}
              onChange={(e) => setOgImageKey(e.target.value)}
              placeholder="Object key in R2 bucket"
            />
          </div>

          <div className="form__actions">
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? "Creating…" : "Create draft"}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
