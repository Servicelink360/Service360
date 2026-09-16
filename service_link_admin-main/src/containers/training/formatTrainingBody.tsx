import React from 'react';

/** Split plain training copy into readable paragraphs / lists for the learner UI. */
export function formatTrainingBody(raw: string): React.ReactNode {
  const text = String(raw || '').replace(/\r\n/g, '\n').trim();
  if (!text) return null;

  let blocks = text
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (blocks.length === 1) {
    const lineBlocks = text
      .split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (lineBlocks.length > 1) blocks = lineBlocks;
  }

  if (blocks.length === 1) {
    blocks = splitDenseParagraph(blocks[0]);
  }

  return blocks.map((block, i) => {
    const listItems = extractListItems(block);
    if (listItems && listItems.items.length >= 2) {
      return (
        <React.Fragment key={i}>
          {listItems.lead ? <p>{listItems.lead}</p> : null}
          <ul>
            {listItems.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        </React.Fragment>
      );
    }
    return <p key={i}>{block}</p>;
  });
}

const SECTION_START =
  /^(?:Employers?|Workers?|Customers?|Visitors?|Managers?|Supervisors?|Contractors?|Moreover|Additionally|Furthermore|However|Importantly|Remember|Note|Warning|PPE|Ladders?|It is a legal|The following|The type of|As a '?worker|Personal protective)\b/i;

function splitDenseParagraph(text: string): string[] {
  // Extracted Word copy often drops periods between sentences.
  const repaired = text.replace(/([a-z0-9)])\s+([A-Z][a-z])/g, '$1. $2');
  const sentences = repaired.match(/[^.!?]+[.!?]+(?:["'\u201d\u2019])?(?:\s+|$)|[^.!?]+$/g);
  if (!sentences || sentences.length < 2) return [text];

  const paras: string[] = [];
  let buf: string[] = [];
  let bufLen = 0;

  for (const raw of sentences) {
    const sentence = raw.trim();
    if (!sentence) continue;

    const forceBreak = buf.length > 0 && SECTION_START.test(sentence);
    const longEnough = bufLen >= 140 || buf.length >= 2;

    if (forceBreak || (longEnough && bufLen + sentence.length > 100)) {
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

function extractListItems(block: string): { lead: string; items: string[] } | null {
  // " hierarchy: A. B. C." or " following: 1. 2. 3."
  const numbered = block.match(
    /^([\s\S]+?[:.])\s*((?:\d+[.)]\s+[\s\S]+)+)$/,
  );
  if (numbered) {
    const items = numbered[2]
      .split(/(?=\d+[.)]\s+)/)
      .map((s) => s.replace(/^\d+[.)]\s*/, '').trim())
      .filter((s) => s.length > 8);
    if (items.length >= 2) return { lead: numbered[1].trim(), items };
  }

  // Hierarchy-style runs: short title-case clauses after "hierarchy"
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
    } else {
      // Trailing sentence after the list  append to last item or keep as lead-less note
      if (items.length) items[items.length - 1] += ` ${t}`;
      else leadParts.push(t);
    }
  }

  if (items.length < 2) return null;
  return { lead: leadParts.join(' ').trim(), items };
}
