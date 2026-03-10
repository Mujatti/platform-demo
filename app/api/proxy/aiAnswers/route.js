/**
 * app/api/proxy/aiAnswers/route.js
 *
 * OPTIONAL thin server-side proxy for AddSearch AI Answers.
 *
 * In the current implementation the demo calls AddSearch directly from the
 * browser via the JS client library (addsearch-js-client), which only needs
 * the PUBLIC siteKey. This proxy file is provided as a placeholder in case
 * you later want to:
 *   - Hide a server-side secret key
 *   - Add extra server-side rate limiting
 *   - Log or transform responses
 *
 * AddSearch AI Answers docs:
 *   https://www.addsearch.com/docs/implementing-ai-answers/
 *
 * AddSearch API reference:
 *   https://www.addsearch.com/docs/api/
 *
 * Environment variables (set in Vercel dashboard if you use this proxy):
 *   ADDSEARCH_SECRET_KEY – your AddSearch private/secret key
 *   NEXT_PUBLIC_ADDSEARCH_SITEKEY – your public siteKey
 *
 * TODO: Replace the placeholder endpoint below with the actual AddSearch
 *       AI Answers REST endpoint once you have server-side credentials.
 */

import { NextResponse } from 'next/server';

const ADDSEARCH_API_BASE = 'https://api.addsearch.com/v1';

export async function POST(request) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "query" field.' },
        { status: 400 }
      );
    }

    const siteKey =
      process.env.NEXT_PUBLIC_ADDSEARCH_SITEKEY ||
      '1bed1ffde465fddba2a53ad3ce69e6c2';

    // TODO: Uncomment and adjust once you have a server-side secret key
    // const secretKey = process.env.ADDSEARCH_SECRET_KEY;
    // if (!secretKey) {
    //   return NextResponse.json(
    //     { error: 'Server-side secret key is not configured.' },
    //     { status: 500 }
    //   );
    // }

    /**
     * Placeholder: Forward the query to AddSearch AI Answers endpoint.
     * The actual endpoint shape may be:
     *   GET https://api.addsearch.com/v1/search/{siteKey}?term={query}&aiAnswers=true
     *
     * Check the latest docs at https://www.addsearch.com/docs/api/
     */
    const url = `${ADDSEARCH_API_BASE}/search/${siteKey}?term=${encodeURIComponent(query)}&aiAnswers=true`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${secretKey}`, // TODO: uncomment if needed
      },
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('aiAnswers proxy error:', err);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
