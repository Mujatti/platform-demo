/**
 * app/components/SearchBox.js
 * Search input with rate-limiting (1 req / 2 sec) and 200-char limit.
 * Edit: Change placeholder text, button label, or char limit here.
 */
'use client';

import { useState, useRef, useCallback } from 'react';

const MAX_QUERY_LENGTH = 200;
const RATE_LIMIT_MS = 2000; // 1 request per 2 seconds

export default function SearchBox({ onSearch, isLoading }) {
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const lastRequestRef = useRef(0);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      setError('');

      const trimmed = query.trim();
      if (!trimmed) return;

      if (trimmed.length > MAX_QUERY_LENGTH) {
        setError(`Query must be ${MAX_QUERY_LENGTH} characters or fewer.`);
        return;
      }

      // Rate-limit guard
      const now = Date.now();
      if (now - lastRequestRef.current < RATE_LIMIT_MS) {
        setError('Please wait a moment before searching again.');
        return;
      }
      lastRequestRef.current = now;

      onSearch(trimmed);
    },
    [query, onSearch]
  );

  return (
    <div className="search-box-wrapper">
      <form className="search-form" onSubmit={handleSubmit}>
        <input
          className="search-input"
          type="text"
          placeholder="Ask a question or search by keyword…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={MAX_QUERY_LENGTH + 10}
          aria-label="Search query"
        />
        <button
          className="search-btn"
          type="submit"
          disabled={isLoading || !query.trim()}
        >
          {/* Magnifying glass icon (inline SVG) */}
          <svg
            className="search-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          Search
        </button>
      </form>

      <div className="search-meta">
        <span>{query.length} / {MAX_QUERY_LENGTH}</span>
        {isLoading && <span>Searching…</span>}
      </div>

      {error && <p className="search-error">{error}</p>}
    </div>
  );
}
