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
      'You are a senior fashion stylist. Evaluate the outfit across these criteria: coherence (does everything belong together), silhouette (overall proportions, balance, and lines), fit (tailoring and drape), color harmony (palette cohesion, contrast, undertones), and styling (layering, balance of casual/formal, intentionality).',
      `User-selected items (prioritize in judgment and suggestions): ${selectedItems.join(', ') || 'None'}.`,
      'Give a 1–5 integer score (no decimals). Then write more descriptive pros and cons as clear bullet points (use \\"- \\"). Pros should highlight strong choices. Cons should give specific, constructive notes. Finally, give a practical, clothing-related suggestion that references the selected items when possible: propose adjustments in color, fit, length, cuff/hem treatment, tucking, rolling sleeves, swapping a layer, or a different wash/pattern. Avoid generic accessory-only advice.',
      'Return JSON ONLY with keys: score (1-5), pros (string), cons (string), suggestion (string). For pros/cons, include multiple bullet lines separated by \n and starting with \\"- \\\". If something is not applicable, return an empty string for that field.',
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


