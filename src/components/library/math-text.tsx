'use client';

import katex from 'katex';

type MathPart =
  | { type: 'text'; value: string }
  | { type: 'math'; value: string; displayMode: boolean };

const ARABIC_MATH_LETTERS = /[\u0621-\u064A]+/g;

function normalizeMathForKatex(value: string) {
  return value
    .replace(/٪/g, '\\%')
    .replace(/(^|[^\\])%/g, '$1\\%')
    .replace(/×/g, '\\times ')
    .replace(/÷/g, '\\div ')
    .replace(ARABIC_MATH_LETTERS, (letters) => `\\text{${letters}}`);
}

function splitMathText(text: string): MathPart[] {
  const parts: MathPart[] = [];
  const re = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\])/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }

    const raw = match[0];
    const displayMode = raw.startsWith('$$') || raw.startsWith('\\[');
    const value = raw.startsWith('$$')
      ? raw.slice(2, -2)
      : raw.startsWith('$')
      ? raw.slice(1, -1)
      : raw.startsWith('\\[')
      ? raw.slice(2, -2)
      : raw.slice(2, -2);

    parts.push({ type: 'math', value, displayMode });
    lastIndex = match.index + raw.length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return parts.length ? parts : [{ type: 'text', value: text }];
}

function renderMath(value: string, displayMode: boolean) {
  try {
    return katex.renderToString(normalizeMathForKatex(value), {
      displayMode,
      output: 'html',
      strict: 'ignore',
      throwOnError: false,
      trust: false,
    });
  } catch {
    return null;
  }
}

export function MathText({
  text,
  fallback,
}: {
  text: string | null | undefined;
  fallback?: React.ReactNode;
}) {
  const trimmed = text?.trim();
  if (!trimmed) return <>{fallback ?? null}</>;

  return (
    <span dir="auto" style={{ unicodeBidi: 'plaintext' }}>
      {splitMathText(trimmed).map((part, index) => {
        if (part.type === 'text') {
          return (
            <span key={index} className="whitespace-pre-wrap">
              {part.value}
            </span>
          );
        }

        const html = renderMath(part.value, part.displayMode);
        if (!html) {
          return (
            <span key={index} className="font-mono">
              {part.value}
            </span>
          );
        }

        return (
          <span
            key={index}
            dir="ltr"
            className={
              part.displayMode
                ? 'my-2 block overflow-x-auto'
                : 'inline-block align-middle'
            }
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </span>
  );
}
