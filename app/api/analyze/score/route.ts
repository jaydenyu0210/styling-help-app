import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 });
    }

    const body = await req.json().catch(() => null) as {
      images?: string[];
      selectedItems?: string[];
    } | null;
    const images = body?.images || [];
    const selectedItems = body?.selectedItems || [];
    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    const description = [
      'Rate the outfit visual appeal from 1 to 5 stars considering coherence, silhouette, fit, color harmony, and styling.',
      `User-selected items: ${selectedItems.join(', ') || 'None'}.`,
      'Return JSON with keys: score (1-5 integer), pros (string|null), cons (string|null), suggestion (string|null).',
      'If score >= 4, focus more on pros; if <= 3, focus more on cons; always include suggestion.',
      'Output strictly as JSON. '
    ].join(' ');

    const content: Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }> = [
      { type: 'text', text: description },
      ...images.map((url) => ({ type: 'image_url' as const, image_url: { url } })),
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You output only valid JSON with the requested keys.' },
          { role: 'user', content },
        ],
        temperature: 0.3,
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: 'OpenAI error', details: text }, { status: 502 });
    }

    const data = await response.json();
    const messageContent = data?.choices?.[0]?.message?.content || '{}';
    let parsed: { score?: number; pros?: string|null; cons?: string|null; suggestion?: string|null } = {};
    try {
      parsed = JSON.parse(messageContent);
    } catch {
      // do nothing
    }

    const score = typeof parsed.score === 'number' ? Math.max(1, Math.min(5, Math.round(parsed.score))) : null;
    return NextResponse.json({
      score,
      pros: parsed.pros ?? null,
      cons: parsed.cons ?? null,
      suggestion: parsed.suggestion ?? null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 });
  }
}


