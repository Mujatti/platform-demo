/**
 * app/page.js
 * HOME PAGE — Search + AI Answers + Keyword Results
 *
 * Uses AddSearch Search UI Library with hasAiAnswers: true.
 * A MutationObserver watches the AI Answers container to detect when
 * an answer has actually rendered, then shows the "Dive Deeper" button.
 *
 * We also hook into the client with a parallel aiAnswers() call to
 * capture the raw structured response (answer text + sources) cleanly,
 * so the /dive page receives well-formatted data — not scraped DOM text.
 *
 * Docs:
 *   https://www.addsearch.com/docs/implementing-ai-answers/
 *   https://www.addsearch.com/docs/ai-answers-to-results-page/
 */
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const siteKey =
  process.env.NEXT_PUBLIC_ADDSEARCH_SITEKEY ||
  '1bed1ffde465fddba2a53ad3ce69e6c2';

export default function HomePage() {
  const router = useRouter();
  const uiRef = useRef(null);
  const clientRef = useRef(null);
  const [showDiveDeeper, setShowDiveDeeper] = useState(false);
  // Store the clean AI answer data captured from the API callback
  const capturedAnswerRef = useRef(null);
  const capturedQueryRef = useRef('');

  useEffect(() => {
    function tryInit() {
      if (
        typeof window === 'undefined' ||
        !window.AddSearchClient ||
        !window.AddSearchUI
      ) {
        return false;
      }
      if (uiRef.current) return true;

      try {
        const client = new window.AddSearchClient(siteKey);
        clientRef.current = client;

        // Disable streaming so answer arrives complete
        if (typeof client.useAiAnswersStream === 'function') {
          client.useAiAnswersStream(false);
        }

        const searchui = new window.AddSearchUI(client, {
          hasAiAnswers: true,
        });

        searchui.searchField({
          containerId: 'addsearch-searchfield',
          placeholder: 'Ask a question or search by keyword…',
          button: 'Search',
          searchAsYouType: false,
        });

        searchui.aiAnswersResult({
          containerId: 'addsearch-ai-answers',
          mainHeadlineText: 'AI-Generated Answer',
          answerMaxHeight: 300,
          sourcesHeadlineText: 'Based on the following sources:',
          hasHideToggle: true,
          expandByDefault: true,
        });

        searchui.searchResults({
          containerId: 'addsearch-results',
        });

        searchui.pagination({
          containerId: 'addsearch-pagination',
        });

        searchui.start();
        uiRef.current = searchui;

        // ── MutationObserver: watch for AI answer content appearing ──
        const aiContainer = document.getElementById('addsearch-ai-answers');
        if (aiContainer) {
          const observer = new MutationObserver(() => {
            // Check if the container now has substantial rendered content
            const hasContent = aiContainer.innerText.trim().length > 30;
            setShowDiveDeeper(hasContent);
          });
          observer.observe(aiContainer, {
            childList: true,
            subtree: true,
            characterData: true,
          });
        }

        // ── Intercept search to also call aiAnswers() for clean data ──
        // Listen for the AddSearch searchfield submit
        const searchFieldEl = document.getElementById('addsearch-searchfield');
        if (searchFieldEl) {
          // Watch for form submissions and input changes
          searchFieldEl.addEventListener('submit', captureQuery, true);
          searchFieldEl.addEventListener('click', captureQueryFromButton, true);
        }

        return true;
      } catch (err) {
        console.error('AddSearch init error:', err);
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

  // Capture the query when the user searches, then fire a parallel
  // aiAnswers() call to get the clean structured response
  function captureQuery(e) {
    setTimeout(grabQueryAndFetch, 100);
  }
  function captureQueryFromButton(e) {
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
      setTimeout(grabQueryAndFetch, 100);
    }
  }

  function grabQueryAndFetch() {
    const input = document.querySelector(
      '#addsearch-searchfield input[type="text"], #addsearch-searchfield input[type="search"], #addsearch-searchfield input'
    );
    const query = input?.value?.trim();
    if (!query || !clientRef.current) return;

    capturedQueryRef.current = query;
    capturedAnswerRef.current = null;
    setShowDiveDeeper(false);

    // Parallel call to get clean structured data
    try {
      clientRef.current.aiAnswers(query, (response) => {
        if (response && response.answer) {
          const sources = (response.sources || []).map((s) => ({
            title: s.title || s.url || '',
            url: s.url || '',
          }));
          capturedAnswerRef.current = {
            answer: response.answer,
            sources,
          };
        }
      });
    } catch (err) {
      console.error('Parallel aiAnswers capture error:', err);
    }
  }

  /* ── Dive Deeper handler ─────────────────────────── */
  const handleDiveDeeper = useCallback(() => {
    const query = capturedQueryRef.current || '';
    let answerText = '';
    let sources = [];

    // Prefer the clean captured API response
    if (capturedAnswerRef.current) {
      answerText = capturedAnswerRef.current.answer;
      sources = capturedAnswerRef.current.sources;
    } else {
      // Fallback: extract from DOM more carefully
      const aiContainer = document.getElementById('addsearch-ai-answers');
      if (aiContainer) {
        // Try to get just the answer paragraph, not headers/buttons/source labels
        const allText = [];
        const paragraphs = aiContainer.querySelectorAll('p, .addsearch-ai-answers-answer, [class*="answer-text"]');
        paragraphs.forEach((el) => {
          const t = el.textContent?.trim();
          if (t && t.length > 10) allText.push(t);
        });
        answerText = allText.join('\n\n') || aiContainer.querySelector('.addsearch-ai-answers-answer')?.textContent?.trim() || '';

        // Get source links
        const sourceSection = aiContainer.querySelector('.addsearch-ai-answers-sources, [class*="sources"]');
        if (sourceSection) {
          sourceSection.querySelectorAll('a[href]').forEach((a) => {
            sources.push({
              title: a.textContent?.trim() || a.href,
              url: a.href,
            });
          });
        }
      }
    }

    try {
      sessionStorage.setItem(
        'diveContext',
        JSON.stringify({
          query,
          answer: answerText,
          sources,
        })
      );
    } catch {
      /* storage may be unavailable */
    }

    router.push('/dive');
  }, [router]);

  return (
    <main>
      <header className="hero-header">
        <span className="hero-badge">Powered by AddSearch</span>
        <h1 className="hero-title">Search + AI Answers</h1>
        <p className="hero-subtitle">
          Ask anything — get instant AI-generated answers grounded in real
          content, plus traditional search results.
        </p>
      </header>

      <div className="page-wrapper">
        {/* Search Field */}
        <div className="search-box-wrapper">
          <div id="addsearch-searchfield" />
        </div>

        {/* AI Answers */}
        <div className="ai-answers-section">
          <div id="addsearch-ai-answers" />

          {/* Dive Deeper — only visible AFTER an AI answer renders */}
          {showDiveDeeper && (
            <div style={{ marginTop: '16px' }}>
              <button className="dive-deeper-btn" onClick={handleDiveDeeper}>
                Dive Deeper
                <span className="dive-deeper-arrow">→</span>
              </button>
            </div>
          )}
        </div>

        {/* Keyword Results */}
        <div className="results-section">
          <div id="addsearch-results" />
        </div>

        <div id="addsearch-pagination" style={{ marginTop: '16px' }} />

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
