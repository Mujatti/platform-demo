/**
 * app/api/proxy/aiConversations/route.js
 *
 * OPTIONAL thin server-side proxy for AddSearch AI Conversations.
 *
 * In the current implementation the demo calls AddSearch directly from the
 * browser via the JS client library. This proxy is a placeholder for when
 * you want to use a server-side secret to access the Conversations API.
 *
 * AddSearch AI Conversations docs:
 *   https://www.addsearch.com/docs/installing-ai-conversations/
 *   https://www.addsearch.com/ai-conversations/
 *
 * AddSearch API reference:
 *   https://www.addsearch.com/docs/api/
 *
 * Environment variables (set in Vercel dashboard if you use this proxy):
 *   ADDSEARCH_SECRET_KEY – your AddSearch private/secret key
 *   NEXT_PUBLIC_ADDSEARCH_SITEKEY – your public siteKey
 *
 * TODO: Replace the placeholder endpoint below with the actual AddSearch
 *       AI Conversations REST endpoint. The endpoint may require:
 *       - A conversation_id for multi-turn context
 *       - An array of previous messages for context seeding
 *       - A server-side secret key in the Authorization header
 *
 * Check AddSearch docs for the latest Conversations API shape.
 */

import { NextResponse } from 'next/server';

const ADDSEARCH_API_BASE = 'https://api.addsearch.com/v1';

export async function POST(request) {
  try {
    const { query, conversationHistory, initialAnswer } =
      await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "query" field.' },
        { status: 400 }
      );
    }

    const siteKey =
      process.env.NEXT_PUBLIC_ADDSEARCH_SITEKEY ||
      '1bed1ffde465fddba2a53ad3ce69e6c2';

    // TODO: Uncomment when you have a secret key
    // const secretKey = process.env.ADDSEARCH_SECRET_KEY;

    /**
     * Placeholder: Forward to AddSearch AI Conversations endpoint.
     *
     * Possible request shape (check actual docs):
     *   POST https://api.addsearch.com/v1/conversations/{siteKey}
     *   Body: {
     *     query: "follow-up question",
     *     context: "initial answer text",
     *     history: [ { role: "user", content: "..." }, ... ]
     *   }
     *
     * For now, we fall back to aiAnswers with context prepended.
     */
    const contextPrefix = initialAnswer
      ? `Context: ${initialAnswer}. Question: `
      : '';
    const fullQuery = contextPrefix + query;

    const url = `${ADDSEARCH_API_BASE}/search/${siteKey}?term=${encodeURIComponent(fullQuery)}&aiAnswers=true`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${secretKey}`, // TODO: uncomment
      },
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('aiConversations proxy error:', err);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
