import React from 'react';

/** Split plain training copy into readable paragraphs / lists for the learner UI. */
export function formatTrainingBody(
  raw: string,
  options?: { imagesAfterIntro?: string[] },
): React.ReactNode {
  const text = String(raw || '').replace(/\r\n/g, '\n').trim();
  const images = (options?.imagesAfterIntro || []).filter(Boolean);
  if (!text && !images.length) return null;

  const blocks = buildBlocks(text);
  const nodes: React.ReactNode[] = [];
  let imagesInserted = false;

  const pushImages = (keyPrefix: string) => {
    if (imagesInserted || !images.length) return;
    imagesInserted = true;
    images.forEach((src, idx) => {
      nodes.push(
        <figure className="training-figure" key={`${keyPrefix}-img-${idx}`}>
          <img src={src} alt="" loading="lazy" />
        </figure>,
      );
    });
  };

  if (!blocks.length) {
    pushImages('solo');
    return nodes;
  }

  blocks.forEach((block, i) => {
    if (block.type === 'image') {
      nodes.push(
        <figure className="training-figure" key={`img-${i}`}>
          <img src={block.src} alt="" loading="lazy" />
        </figure>,
      );
    } else if (block.type === 'video') {
      nodes.push(
        <div className="training-video" key={`vid-${i}`}>
          <iframe
            src={block.src}
            title="Training video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>,
      );
    } else if (block.type === 'list') {
      nodes.push(
        <React.Fragment key={`list-${i}`}>
          {block.lead ? (
            <p className="training-list-lead">{linkifyTrainingText(block.lead)}</p>
          ) : null}
          <ul>
            {block.items.map((item, j) => (
              <li key={j}>{linkifyTrainingText(item)}</li>
            ))}
          </ul>
        </React.Fragment>,
      );
    } else {
      nodes.push(<p key={`p-${i}`}>{linkifyTrainingText(block.text)}</p>);
    }

    if (i === 0) pushImages('after-intro');
  });

  if (!imagesInserted) pushImages('end');
  return nodes;
}

type BodyBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; lead: string; items: string[] }
  | { type: 'image'; src: string }
  | { type: 'video'; src: string };

function buildBlocks(text: string): BodyBlock[] {
  const repaired = repairSentences(text);
  const chunks = expandToChunks(repaired);
  const out: BodyBlock[] = [];

  for (const chunk of chunks) {
    const imageUrl = matchImageBlock(chunk);
    if (imageUrl) {
      out.push({ type: 'image', src: imageUrl });
      continue;
    }
    const embedUrl = matchVideoEmbed(chunk);
    if (embedUrl) {
      out.push({ type: 'video', src: embedUrl });
      continue;
    }

    const list = extractListItems(chunk);
    if (list?.items?.length) {
      out.push({ type: 'list', lead: list.lead, items: list.items });
      if (list.trailing) {
        toParagraphs(list.trailing).forEach((p) => out.push({ type: 'paragraph', text: p }));
      }
      continue;
    }

    toParagraphs(chunk).forEach((p) => out.push({ type: 'paragraph', text: p }));
  }

  return out;
}

function expandToChunks(text: string): string[] {
  // Put each YouTube placeholder on its own block for clearer blue links.
  const normalized = text.replace(
    /\s*((?:WorkSafe\s+)?(?:Victoria\s+)?[^()\n]{3,120}?)\s*\(\s*this is a link to a youtube video\s*\)\s*/gi,
    '\n\n$1 (this is a link to a youtube video)\n\n',
  );

  let chunks = normalized
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (chunks.length === 1) {
    const lines = normalized
      .split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (lines.length > 1) chunks = lines;
  }

  // Pull semicolon lists into their own chunks so list extraction works.
  return chunks.flatMap((chunk) => splitAroundSemicolonLists(chunk));
}

function toParagraphs(text: string): string[] {
  const t = text.trim();
  if (!t) return [];
  if (t.length < 160) return [t];
  return splitDenseParagraph(t);
}

function matchImageBlock(block: string): string | null {
  const m =
    block.match(/^IMAGE:\s*(\S+)\s*$/i) ||
    block.match(/^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/);
  if (!m) return null;
  return (m[2] || m[1] || '').trim() || null;
}

function matchVideoEmbed(block: string): string | null {
  const raw = block.replace(/^VIDEO:\s*/i, '').trim();
  const yt =
    raw.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{6,})/,
    ) || null;
  if (yt?.[1]) return `https://www.youtube.com/embed/${yt[1]}`;
  return null;
}

/** Turn YouTube placeholders and raw URLs into blue clickable links. */
function linkifyTrainingText(text: string): React.ReactNode {
  const raw = String(text || '');
  if (!raw) return null;

  const pattern =
    /((?:WorkSafe\s+)?(?:Victoria\s+)?[^()\n]{3,120}?)\s*\(\s*this is a link to a youtube video\s*\)|(https?:\/\/[^\s<>"']+)/gi;

  const nodes: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(raw)) !== null) {
    if (match.index > last) {
      nodes.push(raw.slice(last, match.index));
    }

    if (match[2]) {
      const href = match[2].replace(/[.,;:!?)]+$/, '');
      const trailing = match[2].slice(href.length);
      nodes.push(
        <a
          key={`a-${key++}`}
          className="training-video-link"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {href}
        </a>,
      );
      if (trailing) nodes.push(trailing);
    } else {
      const label = cleanVideoLabel(match[1] || 'Watch video');
      const href = resolveYoutubePlaceholderUrl(label);
      nodes.push(
        <a
          key={`a-${key++}`}
          className="training-video-link"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {label}
        </a>,
      );
    }

    last = match.index + match[0].length;
  }

  if (last < raw.length) nodes.push(raw.slice(last));
  return nodes.length === 1 && typeof nodes[0] === 'string' ? nodes[0] : nodes;
}

function cleanVideoLabel(label: string): string {
  return String(label || '')
    .replace(/^[\s.]+/, '')
    .replace(/\s+/g, ' ')
    .replace(/^WorkSafe\s+/i, 'WorkSafe ')
    .trim()
    .replace(/^['"‘’]+|['"‘’]+$/g, '')
    .trim();
}

function resolveYoutubePlaceholderUrl(label: string): string {
  const key = label.toLowerCase();
  // Prefer known public WorkSafe / Safe Work Australia resources where possible.
  if (/skeleton/.test(key) && /worker/.test(key)) {
    return 'https://www.youtube.com/results?search_query=WorkSafe+Victoria+Skeleton+Project+Workers';
  }
  if (/skeleton/.test(key) && /supervisor/.test(key)) {
    return 'https://www.youtube.com/results?search_query=WorkSafe+Victoria+Skeleton+Supervisors';
  }
  if (/shoe|store|musculoskeletal/.test(key)) {
    return 'https://www.youtube.com/results?search_query=WorkSafe+Victoria+Musculoskeletal+Injuries+Shoe+Store';
  }
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${label} WorkSafe Victoria`,
  )}`;
}

function repairSentences(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/([a-z0-9)])\s+([A-Z][a-z][\w'-]*)/g, (full, prev, next) => {
      // Only insert a missing period before likely new-section starters.
      if (SECTION_START.test(next)) return `${prev}. ${next}`;
      return full;
    })
    .replace(/\.\s*\./g, '.')
    .trim();
}

const SECTION_START =
  /^(?:Employers?|Workers?|Customers?|Visitors?|Managers?|Contractors?|Moreover|Additionally|Furthermore|However|Importantly|Remember|Note|Warning|PPE|Ladders?|It is a legal|It is critical|The following|The type of|As a '?worker|Personal protective|Following|Your training|At the start|You are also|If you|Reporting|Hold licences|Equipment|Report all|Take reasonable|Comply with|Co-?operate|This includes|When starting|Responsible|A near miss)\b/i;

const LIST_LEAD =
  /((?:^|[.!?]\s+)(?:[^.!?]{0,200}?)(?:should|includes?|following|consider|are|require[sd]?)\s*:)/i;

function splitDenseParagraph(text: string): string[] {
  const sentences = text.match(
    /[^.!?]+[.!?]+(?:["'\u201d\u2019])?(?:\s+|$)|[^.!?]+$/g,
  );
  if (!sentences || sentences.length < 2) return [text];

  const paras: string[] = [];
  let buf: string[] = [];
  let bufLen = 0;

  for (const raw of sentences) {
    const sentence = raw.trim();
    if (!sentence) continue;

    const forceBreak = buf.length > 0 && SECTION_START.test(sentence);
    const longEnough = bufLen >= 110 || buf.length >= 2;

    if (forceBreak || (longEnough && bufLen + sentence.length > 90)) {
      paras.push(buf.join(' '));
      buf = [sentence];
      bufLen = sentence.length;
    } else {
      buf.push(sentence);
      bufLen += sentence.length + 1;
    }
  }

  if (buf.length) paras.push(buf.join(' '));
  return paras.length ? paras : [text];
}

function splitAroundSemicolonLists(text: string): string[] {
  if ((text.match(/;/g) || []).length < 1) {
    return toParagraphs(text);
  }

  const match = text.match(LIST_LEAD);
  if (!match || match.index == null) {
    // Generic "Something: a; b; c"
    const generic = text.match(/^([\s\S]{8,180}:)\s*([^;]{4,};[\s\S]+)$/);
    if (!generic) return toParagraphs(text);
    return finalizeListSplit('', generic[1] + ' ' + generic[2]);
  }

  const leadStart = match.index + (match[0].match(/^[.!?]\s+/)?.[0].length || 0);
  const before = text.slice(0, leadStart).trim();
  const fromLead = text.slice(leadStart).trim();
  return finalizeListSplit(before, fromLead);
}

function finalizeListSplit(before: string, listAndAfter: string): string[] {
  const end = findSemicolonListEnd(listAndAfter);
  const listChunk = listAndAfter.slice(0, end).trim();
  const after = listAndAfter
    .slice(end)
    .replace(/^\.\s*/, '')
    .trim();

  const out: string[] = [];
  if (before) toParagraphs(before).forEach((p) => out.push(p));
  if (listChunk) out.push(listChunk);
  if (after) toParagraphs(after).forEach((p) => out.push(p));
  return out.length ? out : [listAndAfter];
}

function findSemicolonListEnd(listAndMaybeMore: string): number {
  let semis = 0;
  for (let i = 0; i < listAndMaybeMore.length; i++) {
    if (listAndMaybeMore[i] === ';') semis += 1;
    if (semis < 1 || listAndMaybeMore[i] !== '.') continue;
    const next = listAndMaybeMore.slice(i + 1).match(/^\s+([A-Z][\s\S]{0,100})/);
    if (!next) continue;
    if (semis >= 2 && SECTION_START.test(next[1])) return i + 1;
    if (semis >= 2 && /^\s+[A-Z]/.test(listAndMaybeMore.slice(i + 1))) return i + 1;
  }
  // Soft end: first ". Capital" after 2 semicolons
  semis = 0;
  for (let i = 0; i < listAndMaybeMore.length; i++) {
    if (listAndMaybeMore[i] === ';') semis += 1;
    if (semis >= 2 && listAndMaybeMore[i] === '.' && /^\s+[A-Z]/.test(listAndMaybeMore.slice(i + 1))) {
      return i + 1;
    }
  }
  return listAndMaybeMore.length;
}

function extractListItems(
  block: string,
): { lead: string; items: string[]; trailing?: string } | null {
  const numbered = block.match(/^([\s\S]+?[:.])\s*((?:\d+[.)]\s+[\s\S]+)+)$/);
  if (numbered) {
    const items = numbered[2]
      .split(/(?=\d+[.)]\s+)/)
      .map((s) => s.replace(/^\d+[.)]\s*/, '').trim())
      .filter((s) => s.length > 8);
    if (items.length >= 2) return { lead: numbered[1].trim(), items };
  }

  const semi = block.match(
    /^([\s\S]{0,220}?(?:should|includes?|following|consider|are|require[sd]?)\s*:)\s*([\s\S]+)$/i,
  );
  if (semi && (semi[2].match(/;/g) || []).length >= 1) {
    return packSemicolonList(semi[1].trim(), semi[2].trim());
  }

  const genericSemi = block.match(/^([\s\S]{8,180}:)\s*([^;]{4,};[\s\S]+)$/);
  if (genericSemi) {
    return packSemicolonList(genericSemi[1].trim(), genericSemi[2].trim());
  }

  if (!/hierarch/i.test(block)) return null;
  const parts = block.split(/(?<=[.!?])\s+/);
  if (parts.length < 4) return null;

  const leadParts: string[] = [];
  const items: string[] = [];
  let inList = false;
  for (const part of parts) {
    const t = part.trim();
    if (!t) continue;
    const looksLikeControl =
      /^(Eliminate|Passive|Work positioning|Fall injury|Ladders?|Administrative|Isolate|Substitute|Engineering|PPE)\b/i.test(
        t,
      ) && t.length < 220;
    if (looksLikeControl) {
      inList = true;
      items.push(t.replace(/\.$/, ''));
    } else if (!inList) {
      leadParts.push(t);
    } else if (items.length) {
      items[items.length - 1] += ` ${t}`;
    } else {
      leadParts.push(t);
    }
  }
  if (items.length < 2) return null;
  return { lead: leadParts.join(' ').trim(), items };
}

function packSemicolonList(
  lead: string,
  bodyRaw: string,
): { lead: string; items: string[]; trailing?: string } | null {
  let body = bodyRaw;
  let trailing = '';
  const end = findSemicolonListEnd(body);
  if (end < body.length) {
    trailing = body.slice(end).replace(/^\.\s*/, '').trim();
    body = body.slice(0, end).replace(/\.\s*$/, '').trim();
  } else {
    body = body.replace(/\.\s*$/, '').trim();
  }
  const items = body
    .split(/\s*;\s*/)
    .map((s) => s.trim())
    .map((s) => s.replace(/^[a-z]/, (c) => c.toUpperCase()))
    .map((s) => s.replace(/\.$/, '').trim())
    .filter((s) => s.length > 4);
  if (items.length < 2) return null;
  return {
    lead,
    items,
    trailing: trailing || undefined,
  };
}
