/**
 * app/page.js
 * HOME PAGE — Search + AI Answers + Keyword Results
 *
 * Uses the AddSearch Search UI Library (the official way) with:
 *   - hasAiAnswers: true in the SearchUI config
 *   - searchField component for the input
 *   - aiAnswersResult component for the AI answer
 *   - searchResults + pagination for keyword results
 *   - useAiAnswersStream(false) for non-streaming mode
 *
 * The siteKey falls back to the demo key if env var is not set.
 *
 * Docs:
 *   https://www.addsearch.com/docs/implementing-ai-answers/
 *   https://www.addsearch.com/docs/ai-answers-to-results-page/
 *
 * Edit CTA copy at the bottom of this file.
 */
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

/* ── Site Key ─────────────────────────────────────── */
const siteKey =
  process.env.NEXT_PUBLIC_ADDSEARCH_SITEKEY ||
  '1bed1ffde465fddba2a53ad3ce69e6c2';

export default function HomePage() {
  const router = useRouter();
  const uiRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  /* ── Initialize AddSearch Search UI once the CDN scripts load ── */
  useEffect(() => {
    function tryInit() {
      if (
        typeof window === 'undefined' ||
        !window.AddSearchClient ||
        !window.AddSearchUI
      ) {
        return false;
      }

      // Don't re-init
      if (uiRef.current) return true;

      try {
        // 1. Create the JS Client (v1.2+ required for AI Answers)
        const client = new window.AddSearchClient(siteKey);

        // 2. Disable streaming so the full answer renders at once
        //    (set to true if you prefer streaming/typing effect)
        if (typeof client.useAiAnswersStream === 'function') {
          client.useAiAnswersStream(false);
        }

        // 3. Create the Search UI instance with AI Answers enabled
        const conf = {
          hasAiAnswers: true,
        };
        const searchui = new window.AddSearchUI(client, conf);

        // 4. Instantiate the Search Field
        searchui.searchField({
          containerId: 'addsearch-searchfield',
          placeholder: 'Ask a question or search by keyword…',
          button: 'Search',
          searchAsYouType: false,
        });

        // 5. Instantiate the AI Answers result area
        searchui.aiAnswersResult({
          containerId: 'addsearch-ai-answers',
          mainHeadlineText: 'AI-Generated Answer',
          answerMaxHeight: 300,
          sourcesHeadlineText: 'Based on the following sources:',
          hasHideToggle: true,
          expandByDefault: true,
        });

        // 6. Instantiate keyword search results
        searchui.searchResults({
          containerId: 'addsearch-results',
        });

        // 7. Pagination
        searchui.pagination({
          containerId: 'addsearch-pagination',
        });

        // 8. Start the UI
        searchui.start();

        uiRef.current = searchui;
        setIsReady(true);
        return true;
      } catch (err) {
        console.error('AddSearch init error:', err);
        return false;
      }
    }

    // Try immediately, then poll every 200ms until scripts are loaded
    if (!tryInit()) {
      const interval = setInterval(() => {
        if (tryInit()) {
          clearInterval(interval);
        }
      }, 200);
      const timeout = setTimeout(() => clearInterval(interval), 15000);
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, []);

  /* ── Dive Deeper handler: scrape the AI answer from the DOM ──── */
  const handleDiveDeeper = useCallback(() => {
    const aiContainer = document.getElementById('addsearch-ai-answers');
    let summary = '';
    let sources = [];

    if (aiContainer) {
      // Grab rendered AI answer text
      const answerTextEl =
        aiContainer.querySelector('.addsearch-ai-answers-answer') ||
        aiContainer.querySelector('.ai-answers-answer') ||
        aiContainer.querySelector('[class*="answer"]');
      if (answerTextEl) {
        summary = answerTextEl.textContent?.trim() || '';
      }
      if (!summary) {
        summary = aiContainer.innerText?.trim() || '';
        summary = summary
          .replace('AI-Generated Answer', '')
          .replace('Based on the following sources:', '')
          .trim();
      }

      // Grab source links
      const links = aiContainer.querySelectorAll('a[href]');
      links.forEach((a) => {
        const url = a.href;
        const title = a.textContent?.trim() || url;
        if (url && !url.startsWith('javascript')) {
          sources.push({ title, url });
        }
      });
    }

    // Get the search query from the input field
    const searchInput = document.querySelector(
      '#addsearch-searchfield input[type="text"], #addsearch-searchfield input[type="search"]'
    );
    const query = searchInput?.value || '';

    try {
      sessionStorage.setItem(
        'diveContext',
        JSON.stringify({
          query,
          answer: {
            summary: summary || 'AI answer was shown above.',
            highlights: [],
            sources,
          },
        })
      );
    } catch {
      /* storage may be unavailable */
    }

    router.push('/dive');
  }, [router]);

  return (
    <main>
      {/* ── Hero Header ──────────────────────────────── */}
      <header className="hero-header">
        <span className="hero-badge">Powered by AddSearch</span>
        <h1 className="hero-title">Search + AI Answers</h1>
        <p className="hero-subtitle">
          Ask anything — get instant AI-generated answers grounded in real
          content, plus traditional search results.
        </p>
      </header>

      {/* ── Main Content ─────────────────────────────── */}
      <div className="page-wrapper">
        {/* Search Field — AddSearch renders its input here */}
        <div className="search-box-wrapper">
          <div id="addsearch-searchfield" />
        </div>

        {/* AI Answers — AddSearch renders the AI answer here */}
        <div className="ai-answers-section">
          <div id="addsearch-ai-answers" />

          {/* Our custom "Dive Deeper" button */}
          <div style={{ marginTop: '16px' }}>
            <button className="dive-deeper-btn" onClick={handleDiveDeeper}>
              Dive Deeper
              <span className="dive-deeper-arrow">→</span>
            </button>
          </div>
        </div>

        {/* Keyword Results — AddSearch renders results here */}
        <div className="results-section">
          <div id="addsearch-results" />
        </div>

        {/* Pagination */}
        <div id="addsearch-pagination" style={{ marginTop: '16px' }} />

        {/* ── CTA Section ──────────────────────────────
            Edit headline, subheadline, and button URLs here.
        ────────────────────────────────────────────── */}
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

        {/* ── Footer ─────────────────────────────────── */}
        <footer className="footer">
          <p>
            Demo built with{' '}
            <a
              href="https://www.addsearch.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              AddSearch
            </a>{' '}
            · AI Answers · AI Conversations
          </p>
        </footer>
      </div>
    </main>
  );
}
