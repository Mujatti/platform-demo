/**
 * app/components/ResultsList.js
 * Renders keyword search results below the AI Answers box.
 * Uses data from the AddSearch JS client callback.
 *
 * Props:
 *   results  – array of { id, url, title, highlight (snippet) }
 *   loading  – boolean
 *
 * Edit: Tweak card layout or labels here.
 */
'use client';

export default function ResultsList({ results, loading }) {
  if (loading) {
    return (
      <div className="results-section">
        <h2 className="results-heading">Search Results</h2>
        {[1, 2, 3].map((n) => (
          <div className="result-card" key={n}>
            <div className="skeleton-line" style={{ width: '60%' }} />
            <div className="skeleton-line" style={{ width: '90%' }} />
            <div className="skeleton-line" style={{ width: '40%' }} />
          </div>
        ))}
      </div>
    );
  }

  if (!results || results.length === 0) return null;

  return (
    <div className="results-section">
      <h2 className="results-heading">Search Results</h2>
      {results.map((hit, i) => (
        <div className="result-card" key={hit.id || i}>
          <p className="result-title">
            <a href={hit.url}>{hit.title || 'Untitled'}</a>
          </p>
          {hit.highlight && (
            <p
              className="result-snippet"
              dangerouslySetInnerHTML={{ __html: hit.highlight }}
            />
          )}
          {hit.url && <p className="result-url">{hit.url}</p>}
        </div>
      ))}
    </div>
  );
}
