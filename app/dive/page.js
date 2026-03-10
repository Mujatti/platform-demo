/**
 * app/dive/page.js
 * DIVE DEEPER PAGE — Follow-up Q&A powered by AddSearch AI.
 *
 * Features:
 *   - "Dive Deeper" / "Search" toggle at the top
 *   - Initial AI answer with Markdown rendering
 *   - Related Search Results below each AI answer (clickable pills)
 *   - Clicking a related result or "Search" runs keyword search on home page
 *   - Clicking magnifying glass icon runs that query as keyword search
 *
 * Docs:
 *   https://www.addsearch.com/docs/installing-ai-conversations/
 *   https://www.addsearch.com/docs/implementing-ai-answers/
 */
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MarkdownRenderer from '../components/MarkdownRenderer';

const siteKey =
  process.env.NEXT_PUBLIC_ADDSEARCH_SITEKEY ||
  '1bed1ffde465fddba2a53ad3ce69e6c2';

const TIMEOUT_MS = 15000;
const RATE_LIMIT_MS = 2000;

export default function DivePage() {
  const router = useRouter();
  const [context, setContext] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [clientReady, setClientReady] = useState(false);
  // Related search results for the latest AI answer
  const [relatedResults, setRelatedResults] = useState([]);
  const [latestQuery, setLatestQuery] = useState('');
  const lastRequestRef = useRef(0);
  const clientRef = useRef(null);
  const threadEndRef = useRef(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('diveContext');
      if (raw) {
        const parsed = JSON.parse(raw);
        setContext(parsed);
        setLatestQuery(parsed.query || '');
        // Fetch related results for the initial query
        if (parsed.query) {
          fetchRelatedResults(parsed.query);
        }
      }
    } catch { /* */ }
  }, []);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    function tryInit() {
      if (typeof window === 'undefined' || !window.AddSearchClient) return false;
      if (clientRef.current) return true;
      try {
        const c = new window.AddSearchClient(siteKey);
        if (typeof c.useAiAnswersStream === 'function') {
          c.useAiAnswersStream(false);
        }
        clientRef.current = c;
        setClientReady(true);
        return true;
      } catch (err) {
        console.error('Client init error:', err);
        return false;
      }
    }

    if (!tryInit()) {
      const interval = setInterval(() => {
        if (tryInit()) clearInterval(interval);
      }, 200);
      const timeout = setTimeout(() => clearInterval(interval), 15000);
      return () => { clearInterval(interval); clearTimeout(timeout); };
    }
  }, []);

  /* ── Fetch related keyword results for a query ───── */
  function fetchRelatedResults(query) {
    if (!query) return;

    // Wait for client
    function doFetch() {
      const client = clientRef.current;
      if (!client) {
        setTimeout(doFetch, 300);
        return;
      }
      try {
        client.search(query, (response) => {
          if (response && response.hits && response.hits.length > 0) {
            const related = response.hits.slice(0, 4).map((hit) => ({
              title: hit.title || 'Untitled',
              url: hit.url || '',
            }));
            setRelatedResults(related);
          } else {
            setRelatedResults([]);
          }
        });
      } catch {
        setRelatedResults([]);
      }
    }
    doFetch();
  }

  /* ── Build a clean keyword search query from topic + follow-up ── */
  function buildSearchQuery(rawQuery) {
    const topic = context?.query || '';
    const q = rawQuery || latestQuery || topic;

    // If the query is already the original topic, use it as-is
    if (!topic || q === topic) return q;

    // If the follow-up is a short pronoun-heavy question like
    // "how can I implement it?", "what does it cost?", "tell me more"
    // combine it with the original topic into a proper search phrase
    const pronounPatterns = /\b(it|this|that|these|those|them|its)\b/i;
    const vaguePatterns = /^(how|what|where|when|why|can|tell|show|explain|more|details)/i;

    if (pronounPatterns.test(q) || vaguePatterns.test(q)) {
      // Extract the action/intent from the follow-up
      const intent = q
        .replace(/[?!.]+$/g, '')           // strip trailing punctuation
        .replace(/\b(it|this|that|these|those|them|its)\b/gi, '') // remove pronouns
        .replace(/\b(can I|can you|how to|how do I|how can I|tell me|show me|please)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (intent.length > 2) {
        // e.g. topic="custom fields", intent="implement" → "custom fields implementation"
        // Nominalize common verbs
        const nominalized = intent
          .replace(/\bimplement\b/i, 'implementation')
          .replace(/\bconfigure\b/i, 'configuration')
          .replace(/\binstall\b/i, 'installation')
          .replace(/\bsetup\b/i, 'setup')
          .replace(/\bcustomize\b/i, 'customization')
          .replace(/\bintegrate\b/i, 'integration')
          .replace(/\buse\b/i, 'usage')
          .replace(/\benable\b/i, 'enabling')
          .replace(/\bcreate\b/i, 'creating')
          .replace(/\bmanage\b/i, 'managing');

        return `${topic} ${nominalized}`.trim();
      }
      // If intent was all pronouns, just use the topic
      return topic;
    }

    // For specific queries that don't have pronouns, use as-is
    return q;
  }

  /* ── Navigate to home page with a keyword search query ───── */
  function goToSearch(query) {
    const searchQuery = buildSearchQuery(query);
    try {
      sessionStorage.setItem('pendingSearch', searchQuery);
      // Flag that this is a "keyword only" search — suppress AI Answers
      sessionStorage.setItem('pendingSearchMode', 'keywordOnly');
    } catch { /* */ }
    router.push('/');
  }

  /* ── Handle follow-up ───────────────────────────── */
  const handleFollowUp = useCallback(
    (e) => {
      e.preventDefault();
      setError('');

      const trimmed = input.trim();
      if (!trimmed) return;
      if (trimmed.length > 200) {
        setError('Question must be 200 characters or fewer.');
        return;
      }

      const now = Date.now();
      if (now - lastRequestRef.current < RATE_LIMIT_MS) {
        setError('Please wait a moment before asking again.');
        return;
      }
      lastRequestRef.current = now;

      const client = clientRef.current;
      if (!client) {
        setError('Search service is loading. Please try again in a moment.');
        return;
      }

      setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
      setInput('');
      setIsLoading(true);
      setRelatedResults([]);
      setLatestQuery(trimmed);

      const timeout = setTimeout(() => {
        setIsLoading(false);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: 'The response timed out. Please try again.', sources: [] },
        ]);
      }, TIMEOUT_MS);

      try {
        // Prepend the original search topic as a short context hint
        // so the AI knows what "it" or "this" refers to.
        // e.g. "custom fields" + "how can I implement it?"
        //    → "custom fields: how can I implement it?"
        const topic = context?.query || '';
        const contextualQuery = topic
          ? `${topic}: ${trimmed}`
          : trimmed;

        client.aiAnswers(contextualQuery, (response) => {
          clearTimeout(timeout);
          setIsLoading(false);

          if (response && response.answer) {
            const sources = (response.sources || []).map((s) => ({
              title: s.title || s.url || '',
              url: s.url || '',
            }));
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', text: response.answer, sources },
            ]);
            // Fetch related keyword results for this follow-up
            fetchRelatedResults(contextualQuery);
          } else {
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', text: 'I could not find a relevant answer. Try rephrasing your question.', sources: [] },
            ]);
          }
        });
      } catch (err) {
        clearTimeout(timeout);
        setIsLoading(false);
        console.error('Follow-up error:', err);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: 'An error occurred. Please try again.', sources: [] },
        ]);
      }
    },
    [input]
  );

  /* ── Count total keyword results for display ─────── */
  const [totalResults, setTotalResults] = useState(0);
  useEffect(() => {
    if (!latestQuery || !clientRef.current) return;
    try {
      clientRef.current.search(latestQuery, (response) => {
        if (response && typeof response.total_hits === 'number') {
          setTotalResults(response.total_hits);
        }
      });
    } catch { /* */ }
  }, [latestQuery, clientReady]);

  return (
    <main>
      <div className="page-wrapper">
        {/* ── Mode Toggle (Dive Deeper / Search) ──── */}
        <div className="mode-toggle-bar">
          <div className="mode-toggle">
            <button className="mode-toggle-btn mode-toggle-active">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Dive Deeper
            </button>
            <button
              className="mode-toggle-btn"
              onClick={() => goToSearch(latestQuery)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              Search
            </button>
          </div>

          {/* Top-right controls */}
          <div className="mode-toggle-actions">
            <Link href="/" className="mode-action-btn" title="Back to home">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </Link>
          </div>
        </div>

        {/* ── Initial AI Answer ─────────────────────── */}
        {context?.answer && (
          <div className="initial-answer-card">
            <p className="initial-answer-label">Initial AI Answer</p>
            {context.query && (
              <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '12px' }}>
                Query: <strong>{context.query}</strong>
              </p>
            )}
            <MarkdownRenderer content={context.answer} />
            {context.sources && context.sources.length > 0 && (
              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(226,66,42,0.15)' }}>
                <p className="ai-sources-label">Sources</p>
                {context.sources.map((src, i) => (
                  <a key={i} className="ai-source-link" href={src.url}>
                    {src.title}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {!context && (
          <div className="initial-answer-card">
            <p className="initial-answer-text">
              No initial answer found. Please{' '}
              <Link href="/">go back and search</Link> first, then tap &quot;Dive Deeper&quot;.
            </p>
          </div>
        )}

        {/* ── Conversation Thread ──────────────────── */}
        <div className="conversation-thread">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={
                msg.role === 'user'
                  ? 'message-bubble message-user'
                  : 'message-bubble message-assistant'
              }
            >
              {msg.role === 'assistant' ? (
                <MarkdownRenderer content={msg.text} />
              ) : (
                <p>{msg.text}</p>
              )}
              {msg.sources && msg.sources.length > 0 && (
                <div className="message-assistant-sources">
                  <p className="ai-sources-label">Sources</p>
                  {msg.sources.map((src, j) => (
                    <a key={j} className="ai-source-link" href={src.url}>
                      {src.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="typing-indicator">
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
          )}

          <div ref={threadEndRef} />
        </div>

        {/* ── Related Search Results ───────────────── */}
        {relatedResults.length > 0 && !isLoading && (
          <div className="related-results-section">
            <p className="related-results-label">Related Search Results</p>
            <div className="related-results-pills">
              {relatedResults.map((r, i) => (
                <button
                  key={i}
                  className="related-result-pill"
                  onClick={() => goToSearch(r.title)}
                  title={r.title}
                >
                  {r.title}
                </button>
              ))}
              {/* Magnifying glass pill — go to full keyword results */}
              <button
                className="related-result-pill related-result-search-pill"
                onClick={() => goToSearch(latestQuery)}
                title={`Search all results for "${latestQuery}"`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                {totalResults > 0 && (
                  <span>+{totalResults}</span>
                )}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '2px' }}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ── Follow-up Input ──────────────────────── */}
        <form className="dive-input-wrapper" onSubmit={handleFollowUp}>
          <input
            className="dive-input"
            type="text"
            placeholder="Ask a follow-up question…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={210}
            aria-label="Follow-up question"
          />
          <button
            className="dive-submit-btn"
            type="submit"
            disabled={isLoading || !input.trim() || !clientReady}
          >
            Dive Deeper
          </button>
        </form>

        {error && <p className="search-error">{error}</p>}

        {!clientReady && (
          <p style={{ textAlign: 'center', color: '#999', fontSize: '0.85rem', marginTop: '8px' }}>
            Loading search service…
          </p>
        )}

        <section className="cta-section">
          <h2 className="cta-headline">
            Want to try it with your website&apos;s content?
          </h2>
          <p className="cta-subheadline">
            AddSearch Combines Instant Answers With Powerful Search Results
          </p>
          <div className="cta-buttons">
            <a
              className="cta-btn-primary"
              href="https://app.addsearch.com/ver1/signup/user"
              target="_blank"
              rel="noopener noreferrer"
            >
              Start Free Trial
            </a>
            <a
              className="cta-btn-secondary"
              href="https://meetings-eu1.hubspot.com/addsearch/ai-conversations"
              target="_blank"
              rel="noopener noreferrer"
            >
              Personalized Demo
            </a>
          </div>
        </section>

        <footer className="footer">
          <p>
            Demo built with{' '}
            <a href="https://www.addsearch.com/" target="_blank" rel="noopener noreferrer">
              AddSearch
            </a>{' '}
            · AI Answers · AI Conversations
          </p>
        </footer>
      </div>
    </main>
  );
}
