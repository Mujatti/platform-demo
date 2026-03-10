/**
 * app/components/AiAnswersBox.js
 * Displays AI-generated answer with summary, highlights, citations, and
 * a "Dive Deeper" button that navigates to /dive.
 *
 * Props:
 *   answer   – { summary, highlights[], sources[{title,url}] } | null
 *   loading  – boolean
 *   query    – the original search query string
 *
 * Edit: Change labels like "AI-Generated Answer", "Based on these sources",
 *       or the "Dive Deeper" button label here.
 */
'use client';

import { useRouter } from 'next/navigation';

export default function AiAnswersBox({ answer, loading, query }) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="ai-answers-section">
        <div className="ai-answers-card ai-loading">
          <div className="skeleton-line" />
          <div className="skeleton-line" />
          <div className="skeleton-line" />
          <div className="skeleton-line" />
        </div>
      </div>
    );
  }

  if (!answer) return null;

  const handleDiveDeeper = () => {
    // Pass query + answer to the /dive page via sessionStorage
    // (avoids exposing long data in URL params)
    try {
      sessionStorage.setItem(
        'diveContext',
        JSON.stringify({ query, answer })
      );
    } catch {
      /* storage may be unavailable */
    }
    router.push('/dive');
  };

  return (
    <div className="ai-answers-section">
      <div className="ai-answers-card">
        {/* Label */}
        <div className="ai-label">
          <span className="ai-label-dot" />
          AI-Generated Answer
        </div>

        {/* Summary */}
        {answer.summary && (
          <p className="ai-summary">{answer.summary}</p>
        )}

        {/* Bullet highlights */}
        {answer.highlights && answer.highlights.length > 0 && (
          <ul className="ai-highlights">
            {answer.highlights.map((h, i) => (
              <li key={i}>
                <span className="ai-highlight-icon">▸</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Sources / Citations */}
        {answer.sources && answer.sources.length > 0 && (
          <div className="ai-sources">
            <p className="ai-sources-label">Based on these sources</p>
            {answer.sources.map((src, i) => (
              <a
                key={i}
                className="ai-source-link"
                href={src.url}
                /* Opens in same tab per spec */
              >
                {src.title || src.url}
              </a>
            ))}
          </div>
        )}

        {/* Dive Deeper CTA */}
        <button className="dive-deeper-btn" onClick={handleDiveDeeper}>
          Dive Deeper
          <span className="dive-deeper-arrow">→</span>
        </button>
      </div>
    </div>
  );
}
