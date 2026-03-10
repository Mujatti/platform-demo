/**
 * app/dive/page.js
 * DIVE DEEPER PAGE — Follow-up Q&A powered by AddSearch AI.
 *
 * Displays the initial AI answer cleanly at top, then provides a
 * follow-up Q&A interface. Follow-ups use client.aiAnswers() with
 * just the user's question (no context-stuffing — the previous approach
 * of prepending the initial answer was causing the API to return no results).
 *
 * The word "chat" is intentionally avoided throughout.
 *
 * Docs:
 *   https://www.addsearch.com/docs/installing-ai-conversations/
 *   https://www.addsearch.com/docs/implementing-ai-answers/
 */
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

const siteKey =
  process.env.NEXT_PUBLIC_ADDSEARCH_SITEKEY ||
  '1bed1ffde465fddba2a53ad3ce69e6c2';

const TIMEOUT_MS = 15000;
const RATE_LIMIT_MS = 2000;

export default function DivePage() {
  const [context, setContext] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [clientReady, setClientReady] = useState(false);
  const lastRequestRef = useRef(0);
  const clientRef = useRef(null);
  const threadEndRef = useRef(null);

  /* Recover context from home page */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('diveContext');
      if (raw) {
        setContext(JSON.parse(raw));
      }
    } catch {
      /* sessionStorage unavailable */
    }
  }, []);

  /* Auto-scroll */
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  /* Initialize AddSearch client */
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
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, []);

  /* ── Handle follow-up ──────────────────────────────── */
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

      // Send JUST the user's question — do NOT stuff the initial answer
      // as a prefix. The previous approach was breaking the API because
      // the combined string was too long / confusing the AI model.
      const timeout = setTimeout(() => {
        setIsLoading(false);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: 'The response timed out. Please try again.', sources: [] },
        ]);
      }, TIMEOUT_MS);

      try {
        client.aiAnswers(trimmed, (response) => {
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

  /* ── Render helper: format answer text into paragraphs ──────── */
  function formatAnswer(text) {
    if (!text) return null;
    // Split on double newlines or common section patterns
    const paragraphs = text
      .split(/\n\n+|\n(?=[A-Z][a-z]+ [A-Z])/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (paragraphs.length <= 1) {
      // Single block — split on sentence boundaries for readability
      const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim());
      if (sentences.length > 4) {
        // Group into paragraphs of ~3 sentences
        const groups = [];
        for (let i = 0; i < sentences.length; i += 3) {
          groups.push(sentences.slice(i, i + 3).join(' '));
        }
        return groups.map((g, i) => <p key={i} style={{ marginBottom: '12px' }}>{g}</p>);
      }
      return <p>{text}</p>;
    }

    return paragraphs.map((p, i) => (
      <p key={i} style={{ marginBottom: '12px' }}>{p}</p>
    ));
  }

  return (
    <main>
      <div className="page-wrapper">
        <div className="dive-header">
          <Link href="/" className="back-link">← Back to Search</Link>
        </div>

        <h1 className="dive-page-title">Dive Deeper</h1>

        {/* ── Initial AI Answer ─────────────────────── */}
        {context?.answer && (
          <div className="initial-answer-card">
            <p className="initial-answer-label">Initial AI Answer</p>
            {context.query && (
              <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '12px' }}>
                Query: <strong>{context.query}</strong>
              </p>
            )}
            <div className="initial-answer-text">
              {formatAnswer(context.answer)}
            </div>
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
                <div>{formatAnswer(msg.text)}</div>
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

        {/* CTA */}
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
