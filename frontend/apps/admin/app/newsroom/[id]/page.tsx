"use client";

import { useEffect, useState, FormEvent } from "react";
import { createClient } from "../../../lib/supabase";
import { Button, Alert, EmptyState, buttonClassName } from "@epelawa/ui";

/**
 * Edit an existing article.
 *
 * Loads the article and its current version. Submits changes through the
 * article_submit security definer function (draft → review) with revision CAS.
 */
export default function EditArticlePage({ params }: { params: { id: string } }) {
  const [article, setArticle] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [revision, setRevision] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("articles")
        .select(`
          id,
          slug,
          revision,
          current_version:current_version_id (
            id,
            title,
            summary,
            body,
            state,
            version_number
          )
        `)
        .eq("id", params.id)
        .single();

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      const cv = data.current_version as any;
      setArticle(data);
      setTitle(cv?.title || "");
      setSummary(cv?.summary || "");
      setBody(typeof cv?.body === "string" ? cv.body : JSON.stringify(cv?.body, null, 2));
      setRevision(data.revision);
      setLoading(false);
    };
    load();
  }, [params.id]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("article_submit", {
        p_article_id: params.id,
        p_expected_revision: revision,
      });

      if (rpcError) throw rpcError;

      window.location.href = `/newsroom/${params.id}`;
    } catch (err: any) {
      setError(err.message || "Failed to submit for review.");
    } finally {
      setLoading(false);
    }
  };

  if (loading || !article) {
    return (
      <main id="main" className="site-main" tabIndex={-1}>
        <div className="ep-container">
          <div className="admin-empty">
            <h2 className="admin-empty__title">Loading…</h2>
          </div>
        </div>
      </main>
    );
  }

  const cv = article.current_version as any;

  return (
    <main id="main" className="site-main" tabIndex={-1}>
      <div className="ep-container">
        <div className="page-header">
          <h1 className="page-header__title">Edit draft</h1>
          <p className="page-header__lede">
            Edit article "{cv?.title || "(untitled)"}". Revision {revision}.
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
            />
          </div>

          <div className="form__actions">
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? "Submitting…" : "Submit for review"}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
