import React from 'react';

/** Split plain training copy into readable paragraphs / lists for the learner UI. */
export function formatTrainingBody(
  raw: string,
  options?: { imagesAfterIntro?: string[]; title?: string },
): React.ReactNode {
  const text = String(raw || '').replace(/\r\n/g, '\n').trim();
  const images = (options?.imagesAfterIntro || []).filter(Boolean);
  if (!text && !images.length) return null;

  const blocks = buildBlocks(text);
  const embeddedHero = blocks.find((b) => b.type === 'image') as { type: 'image'; src: string } | undefined;
  const heroSrc = images[0] || embeddedHero?.src || null;
  const restImages = images.filter((src) => src !== heroSrc);

  type RenderItem =
    | { kind: 'lead'; text: string }
    | { kind: 'section'; heading?: string; paragraphs: string[] }
    | { kind: 'list'; lead: string; items: string[] }
    | { kind: 'video'; src: string }
    | { kind: 'image'; src: string };

  const items: RenderItem[] = [];
  let leadUsed = false;
  let restImagesPlaced = false;

  const placeRestImages = () => {
    if (restImagesPlaced || !restImages.length) return;
    restImagesPlaced = true;
    restImages.forEach((src) => items.push({ kind: 'image', src }));
  };

  for (const block of blocks) {
    if (block.type === 'image') {
      if (heroSrc && block.src === heroSrc) continue;
      items.push({ kind: 'image', src: block.src });
      continue;
    }
    if (block.type === 'video') {
      items.push({ kind: 'video', src: block.src });
      continue;
    }
    if (block.type === 'list') {
      items.push({ kind: 'list', lead: block.lead, items: block.items });
      placeRestImages();
      continue;
    }
    if (isHeadingText(block.text)) {
      items.push({ kind: 'section', heading: block.text, paragraphs: [] });
      continue;
    }
    if (!leadUsed) {
      leadUsed = true;
      items.push({ kind: 'lead', text: block.text });
      placeRestImages();
      continue;
    }
    const last = items[items.length - 1];
    if (last?.kind === 'section') {
      last.paragraphs.push(block.text);
    } else {
      items.push({ kind: 'section', paragraphs: [block.text] });
    }
  }

  placeRestImages();

  return (
    <div className="training-brief">
      {heroSrc ? (
        <div className="training-brief__hero">
          <img src={heroSrc} alt={options?.title || 'Training illustration'} loading="lazy" />
          {options?.title ? <span className="training-brief__hero-label">{options.title}</span> : null}
        </div>
      ) : null}
      {items.map((item, i) => {
        if (item.kind === 'lead') {
          return (
            <p className="training-brief__lead" key={`lead-${i}`}>
              {linkifyTrainingText(item.text)}
            </p>
          );
        }
        if (item.kind === 'section') {
          return (
            <div className="training-brief__section" key={`sec-${i}`}>
              {item.heading ? <h4>{linkifyTrainingText(item.heading)}</h4> : null}
              {item.paragraphs.map((paragraph, pIndex) => (
                <p key={pIndex}>{linkifyTrainingText(paragraph)}</p>
              ))}
            </div>
          );
        }
        if (item.kind === 'list') {
          return (
            <div className="training-brief__discussion" key={`list-${i}`}>
              <h4>{linkifyTrainingText(stripListColon(item.lead) || 'Key points')}</h4>
              <ol>
                {item.items.map((listItem, j) => (
                  <li key={j}>{linkifyTrainingText(listItem)}</li>
                ))}
              </ol>
            </div>
          );
        }
        if (item.kind === 'video') {
          return (
            <div className="training-video" key={`vid-${i}`}>
              <iframe
                src={item.src}
                title={options?.title ? `${options.title} video` : 'Training video'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          );
        }
        return (
          <figure className="training-figure" key={`img-${i}`}>
            <img src={item.src} alt={options?.title || 'Training illustration'} loading="lazy" />
          </figure>
        );
      })}
    </div>
  );
}

function stripListColon(lead: string) {
  return String(lead || '')
    .replace(/:\s*$/, '')
    .trim();
}

function isHeadingText(text: string) {
  const t = String(text || '').trim();
  if (!t || t.length > 72) return false;
  if (/[.?!]$/.test(t)) return false;
  if (/^(https?:\/\/|IMAGE:|VIDEO:)/i.test(t)) return false;
  if (/^\d+[.)]\s/.test(t)) return false;
  return true;
}

type BodyBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; lead: string; items: string[] }
  | { type: 'image'; src: string }
  | { type: 'video'; src: string };

/** Same shape as toolbox briefs: short lead, headed sections, short paragraphs. */
function buildBlocks(text: string): BodyBlock[] {
  const prepared = isolateMediaAndVideos(String(text || '').replace(/\r\n/g, '\n'));
  const lined = hasToolboxLineStructure(prepared)
    ? prepared
    : structureDenseTrainingText(prepared);

  const lines = lined
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const out: BodyBlock[] = [];
  for (const line of lines) {
    const imageUrl = matchImageBlock(line);
    if (imageUrl) {
      out.push({ type: 'image', src: imageUrl });
      continue;
    }
    const embedUrl = matchVideoEmbed(line) || matchYoutubePlaceholder(line);
    if (embedUrl) {
      out.push({ type: 'video', src: embedUrl });
      continue;
    }
    const list = extractListItems(line);
    if (list?.items?.length) {
      out.push({ type: 'list', lead: list.lead, items: list.items });
      if (list.trailing) {
        shortParagraphs(list.trailing).forEach((p) => out.push({ type: 'paragraph', text: p }));
      }
      continue;
    }
    if (isHeadingText(line)) {
      out.push({ type: 'paragraph', text: line });
      continue;
    }
    shortParagraphs(line).forEach((p) => out.push({ type: 'paragraph', text: p }));
  }
  return out;
}

function isolateMediaAndVideos(text: string): string {
  return text
    .replace(/^\s*(IMAGE|VIDEO):\s*(\S+)\s*$/gim, '\n$1: $2\n')
    .replace(
      /\s*((?:WorkSafe\s+)?(?:Victoria\s+)?[^()\n]{3,120}?)\s*\(\s*this is a link to a youtube video\s*\)\s*/gi,
      '\n$1 (this is a link to a youtube video)\n',
    )
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function hasToolboxLineStructure(text: string): boolean {
  const lines = text
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 3) return false;
  const longLines = lines.filter(
    (line) => line.length > 220 && !/^(IMAGE|VIDEO):/i.test(line) && !isHeadingText(line),
  ).length;
  // Prefer the dense reformatter when any paragraph is still a wall of text.
  if (longLines > 0) return false;
  const short = lines.filter((line) => line.length <= 140 || isHeadingText(line)).length;
  return short >= Math.min(3, lines.length);
}

/** Pull common induction headings onto their own lines, then keep sentences short. */
function structureDenseTrainingText(text: string): string {
  let t = text.replace(/\s+/g, ' ').trim();
  const headings = [
    'How this module works',
    'Once you have completed the module',
    'Once you.?ve completed this module',
    'Once you have completed this module',
    'Learning Outcomes',
    'Learning outcomes',
    'Introduction',
    'Key terms',
    'Key points',
    'Summary',
    'Completion of Learning Section',
    'Person or Persons Conducting a Business or Undertaking \\(PCBU\\)',
    'Persons Conducting a Business or Undertaking \\(PCBU\\)',
    'PCBU',
    'Workers',
    'Duties in the Workplace',
    'Duties in the workplace',
    'Employers',
    "Workers' duties",
    'Your Responsibility',
    'Your responsibility',
    'Risk Management',
    'Risk management',
    'Hazard Identification',
    'Hazard identification',
    'Common Workplace Hazards',
    'Training & Supervision',
    'Training and Supervision',
    'Forklift Hazards',
    'Operation Fundamentals',
    'Parking',
    'Managing Forklift Instability',
    'Managing Forklift',
    'Loads and Load Handling',
    'Attachments',
    'Ventilation',
    'Poor Ventilation Resulting in Exposure to Harmful Gas Emissions',
    'Ramps & Loading Docks',
    'Out of Service',
    'The Risks',
    'Forklift Instability',
    'Store Worker Hazards',
    'Mobile Plant',
    'Signage & Placards',
    'Signage and Placards',
    'Minimising Hazardous Manual Handling',
    'Workplace Harassment',
    'Sexual Harassment',
    'Discrimination',
    'Bullying',
    'What Causes Workplace Stress',
    'Ergonomics',
    'Emergency Management',
    'Working at heights',
    'Working at Heights',
    'Ladders',
    'Starting your new role',
    'Computer Screen',
    'Basically',
  ];
  for (const heading of headings) {
    const re = new RegExp(`(?:^|[.\\s:;])(${heading})(?=\\s|[–—:\\-]|$)`, 'gi');
    t = t.replace(re, (full, hit) => {
      const prefix = full.slice(0, full.length - hit.length).trimEnd();
      return `${prefix ? `${prefix}\n` : ''}${hit}\n`;
    });
  }
  t = t.replace(/:\s+(?=[A-Z])/g, ':\n');
  t = t.replace(/(^|\n):\s*(?=\n|$)/g, '$1');
  // Split long sentences onto separate lines for toolbox-style paragraphs.
  t = t
    .split(/\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      if (isHeadingText(trimmed) || /^(IMAGE|VIDEO):/i.test(trimmed)) return trimmed;
      return shortParagraphs(trimmed).join('\n');
    })
    .filter(Boolean)
    .join('\n');
  return t;
}

function shortParagraphs(text: string): string[] {
  const t = text.trim();
  if (!t) return [];
  if (t.length <= 140) return [t];
  const sentences = t.match(/[^.!?]+[.!?]+(?:["'\u201d\u2019])?(?:\s+|$)|[^.!?]+$/g);
  if (!sentences || sentences.length < 2) return [t];

  const paras: string[] = [];
  let buf: string[] = [];
  let bufLen = 0;
  for (const raw of sentences) {
    const sentence = raw.trim();
    if (!sentence) continue;
    const nextLen = bufLen + sentence.length + (buf.length ? 1 : 0);
    if (buf.length && (bufLen >= 90 || nextLen > 160 || buf.length >= 2)) {
      paras.push(buf.join(' '));
      buf = [sentence];
      bufLen = sentence.length;
    } else {
      buf.push(sentence);
      bufLen = nextLen;
    }
  }
  if (buf.length) paras.push(buf.join(' '));
  return paras.length ? paras : [t];
}

function matchImageBlock(block: string): string | null {
  const m =
    block.match(/^IMAGE:\s*(\S+)\s*$/i) ||
    block.match(/^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/);
  if (!m) return null;
  return (m[2] || m[1] || '').trim() || null;
}

function matchYoutubePlaceholder(line: string): string | null {
  const m = line.match(/^(.*)\(\s*this is a link to a youtube video\s*\)\s*$/i);
  if (!m) return null;
  return resolveYoutubeEmbed(cleanVideoLabel(m[1] || ''));
}

function youtubeEmbed(id: string) {
  return `https://www.youtube.com/embed/${id}`;
}

function youtubeWatch(id: string) {
  return `https://www.youtube.com/watch?v=${id}`;
}

/** Known public WorkSafe Victoria films named in the topic text. */
function knownYoutubeId(label: string): string | null {
  const key = label.toLowerCase();
  if (/skeleton/.test(key) && /worker/.test(key)) return 'Gcpd8y-jN4E';
  if (/skeleton/.test(key) && /supervisor/.test(key)) return '9U7g6iL1_JM';
  if ((/shoe/.test(key) || /store/.test(key)) && /musculoskeletal|shoe/.test(key)) {
    return 'DeAqzydHE2k';
  }
  return null;
}

function resolveYoutubeEmbed(label: string): string | null {
  const id = knownYoutubeId(label);
  return id ? youtubeEmbed(id) : null;
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
  const id = knownYoutubeId(label);
  if (id) return youtubeWatch(id);
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${label} WorkSafe Victoria`,
  )}`;
}

function repairSentences(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

const SECTION_START =
  /^(?:Employers?|Workers?|Customers?|Visitors?|Managers?|Contractors?|Moreover|Additionally|Furthermore|However|Importantly|Remember|Note|Warning|PPE|Ladders?|It is a legal|It is critical|The following|The type of|As a '?worker|Personal protective|Following|Your training|At the start|You are also|If you|Reporting|Hold licences|Equipment|Report all|Take reasonable|Comply with|Co-?operate|This includes|When starting|Responsible|A near miss)\b/i;

const LIST_LEAD =
  /((?:^|[.!?]\s+)(?:[^.!?]{0,200}?)(?:should|includes?|following|consider|are|require[sd]?)\s*:)/i;

function splitAroundSemicolonLists(text: string): string[] {
  if ((text.match(/;/g) || []).length < 1) {
    return shortParagraphs(text);
  }

  const match = text.match(LIST_LEAD);
  if (!match || match.index == null) {
    // Generic "Something: a; b; c"
    const generic = text.match(/^([\s\S]{8,180}:)\s*([^;]{4,};[\s\S]+)$/);
    if (!generic) return shortParagraphs(text);
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
  if (before) shortParagraphs(before).forEach((p) => out.push(p));
  if (listChunk) out.push(listChunk);
  if (after) shortParagraphs(after).forEach((p) => out.push(p));
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
