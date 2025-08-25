import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 });
    }

    const body = await req.json().catch(() => null) as { images?: string[] } | null;
    const images = body?.images || [];
    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    // Build vision message content
    const content: Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }> = [
      {
        type: 'text',
        text: [
          'You are a precise fashion vision assistant. Analyze ALL provided images and list DISTINCT clothing items worn by the person(s).',
          'Make each item description more informative than a generic label: include specific garment subtype and one to two useful qualifiers such as fit/silhouette, length, neckline/collar, wash/pattern, or fabric weight when confidently visible (e.g., "slim-fit dark-wash jeans", "oversized crewneck sweatshirt", "cropped double-breasted blazer").',
          'Do not include brands or logos. Avoid guessing exact materials unless obvious (e.g., denim). Prefer concise phrases (≤ 6 words) that still convey styling detail.',
          'Deduplicate across images. Return 3–12 items total if visible; otherwise fewer.',
          'Return JSON ONLY in the format: {"items":["..."]}',
        ].join(' ')
      },
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
        temperature: 0.2,
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: 'OpenAI error', details: text }, { status: 502 });
    }

    const data = await response.json();
    const messageContent = data?.choices?.[0]?.message?.content || '{}';
    let parsed: { items?: string[] } = {};
    try {
      parsed = JSON.parse(messageContent);
    } catch {
      // Try to salvage array-like output
      const match = messageContent.match(/\[(.|\n|\r)*\]/);
      if (match) {
        try { parsed = { items: JSON.parse(match[0]) }; } catch {}
      }
    }

    const items = Array.isArray(parsed.items) ? parsed.items : [];
    const cleaned = Array.from(new Set(items
      .filter((x) => typeof x === 'string')
      .map((x) => x.trim())
      .filter(Boolean)
    ));

    return NextResponse.json({ items: cleaned });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 });
  }
}


