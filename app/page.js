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
 * so the /dive page receives well-formatted data.
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

        // Watch for AI answer content appearing
        const aiContainer = document.getElementById('addsearch-ai-answers');
        if (aiContainer) {
          const observer = new MutationObserver(() => {
            // Only show Dive Deeper if AI container is visible and has content
            const isVisible = aiContainer.style.display !== 'none';
            const hasContent = aiContainer.innerText.trim().length > 30;
            setShowDiveDeeper(isVisible && hasContent);
          });
          observer.observe(aiContainer, {
            childList: true,
            subtree: true,
            characterData: true,
          });
        }

        // Listen for search submissions to fire parallel capture
        // Also re-show AI answers container in case it was hidden by keywordOnly mode
        const searchFieldEl = document.getElementById('addsearch-searchfield');
        if (searchFieldEl) {
          function onManualSearch() {
            // Re-show AI answers for manual searches
            const aiC = document.getElementById('addsearch-ai-answers');
            if (aiC) aiC.style.display = '';
            setTimeout(grabQueryAndFetch, 100);
          }
          searchFieldEl.addEventListener('submit', onManualSearch, true);
          searchFieldEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') onManualSearch();
          }, true);
          searchFieldEl.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
              onManualSearch();
            }
          }, true);
        }

        // Check for pending search from /dive page navigation
        try {
          const pending = sessionStorage.getItem('pendingSearch');
          const pendingMode = sessionStorage.getItem('pendingSearchMode');
          if (pending) {
            sessionStorage.removeItem('pendingSearch');
            sessionStorage.removeItem('pendingSearchMode');

            const isKeywordOnly = pendingMode === 'keywordOnly';

            setTimeout(() => {
              const inp = document.querySelector(
                '#addsearch-searchfield input[type="text"], #addsearch-searchfield input[type="search"], #addsearch-searchfield input'
              );
              if (!inp) return;

              // Fill the search field
              const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype, 'value'
              ).set;
              nativeInputValueSetter.call(inp, pending);
              inp.dispatchEvent(new Event('input', { bubbles: true }));

              if (isKeywordOnly) {
                // KEYWORD ONLY mode: hide AI answers, run search directly
                // Hide the AI answers container so it doesn't show stale/new answers
                const aiContainer = document.getElementById('addsearch-ai-answers');
                if (aiContainer) aiContainer.style.display = 'none';
                // Also hide our Dive Deeper button
                setShowDiveDeeper(false);

                // Use the client directly for keyword-only search
                setTimeout(() => {
                  // Trigger the AddSearch UI search (which populates results)
                  const btn = document.querySelector('#addsearch-searchfield button');
                  if (btn) btn.click();

                  // After the search triggers, re-hide AI answers
                  // (the SearchUI might show it again)
                  setTimeout(() => {
                    const aiC = document.getElementById('addsearch-ai-answers');
                    if (aiC) aiC.style.display = 'none';
                    setShowDiveDeeper(false);
                  }, 500);
                  setTimeout(() => {
                    const aiC = document.getElementById('addsearch-ai-answers');
                    if (aiC) aiC.style.display = 'none';
                    setShowDiveDeeper(false);
                  }, 1500);
                  setTimeout(() => {
                    const aiC = document.getElementById('addsearch-ai-answers');
                    if (aiC) aiC.style.display = 'none';
                    setShowDiveDeeper(false);
                  }, 3000);
                }, 100);
              } else {
                // Normal mode: trigger full search with AI answers
                setTimeout(() => {
                  const btn = document.querySelector('#addsearch-searchfield button');
                  if (btn) btn.click();
                  capturedQueryRef.current = pending;
                  grabQueryAndFetch();
                }, 100);
              }
            }, 400);
          }
        } catch { /* */ }

        return true;
      } catch (err) {
        console.error('AddSearch init error:', err);
        return false;
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

  const handleDiveDeeper = useCallback(() => {
    const query = capturedQueryRef.current || '';
    let answerText = '';
    let sources = [];

    if (capturedAnswerRef.current) {
      answerText = capturedAnswerRef.current.answer;
      sources = capturedAnswerRef.current.sources;
    }

    try {
      sessionStorage.setItem(
        'diveContext',
        JSON.stringify({ query, answer: answerText, sources })
      );
    } catch { /* */ }

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
        <div className="search-box-wrapper">
          <div id="addsearch-searchfield" />
        </div>

        <div className="ai-answers-section">
          <div id="addsearch-ai-answers" />
          {showDiveDeeper && (
            <div style={{ marginTop: '16px' }}>
              <button className="dive-deeper-btn" onClick={handleDiveDeeper}>
                Dive Deeper
                <span className="dive-deeper-arrow">→</span>
              </button>
            </div>
          )}
        </div>

        <div className="results-section">
          <div id="addsearch-results" />
        </div>

        <div id="addsearch-pagination" style={{ marginTop: '16px' }} />

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
