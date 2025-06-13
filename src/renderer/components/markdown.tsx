import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

import 'katex/dist/katex.min.css';
import katex from 'katex';
import React, { useMemo, useEffect, useRef } from 'react';
import { openExternalLink } from '@src/renderer/utils/linkHandler';

// Configure marked
marked.setOptions({
  gfm: true,
  breaks: true,
  silent: true,
});

// Use marked hooks to customize link rendering
marked.use({
  hooks: {
    postprocess(html) {
      // Replace all links with target="_blank"
      return html.replace(
        /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/g,
        '<a href=$1$2$1 target="_blank" rel="noopener noreferrer"'
      );
    },
  },
});

// Configure DOMPurify settings
const purifyConfig = {
  ADD_TAGS: ['img', 'h1', 'h2', 'h3', 'span', 'sub', 'sup', 'code', 'pre'],
  ADD_ATTR: ['class', 'style', 'language', 'target', 'rel', 'href'],
  FORBID_TAGS: [],
  FORBID_ATTR: [],
};

// Use a more efficient cache
const MAX_CACHE_SIZE = 200; // Increase cache size for better performance
const markdownCache = new Map<string, string>();

// LRU cache mechanism to remove the least recently used items first
const cacheKeys: string[] = [];

function addToCache(key: string, value: string) {
  // If the key already exists, remove it from its current position
  const existingIndex = cacheKeys.indexOf(key);
  if (existingIndex > -1) {
    cacheKeys.splice(existingIndex, 1);
  }

  // Add key to the end of the array (most recently used)
  cacheKeys.push(key);

  // Store the value in the cache
  markdownCache.set(key, value);

  // Trim cache if needed
  if (cacheKeys.length > MAX_CACHE_SIZE) {
    const oldestKey = cacheKeys.shift();
    if (oldestKey) {
      markdownCache.delete(oldestKey);
    }
  }
}

// Helper to escape HTML for error displays
function escapeHTML(html: string): string {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Helper to render LaTeX with KaTeX
function renderLatex(formula: string, displayMode: boolean): string {
  try {
    return katex.renderToString(formula.trim(), { displayMode });
  } catch (e) {
    console.warn('KaTeX error:', e);
    return displayMode
      ? `<div class="katex-error">$$${escapeHTML(formula)}$$</div>`
      : `<span class="katex-error">$${escapeHTML(formula)}$</span>`;
  }
}

// Apply syntax highlighting to code
function highlightCode(code: string, language?: string): string {
  if (language && hljs.getLanguage(language)) {
    try {
      return hljs.highlight(code, { language }).value;
    } catch (e) {
      console.error('Highlight.js error:', e);
    }
  }

  try {
    return hljs.highlightAuto(code).value;
  } catch (e) {
    console.error('Highlight.js auto-detect error:', e);
  }

  return escapeHTML(code);
}

// Pre-process content with LaTeX and code handling
function preProcessContent(content: string): string {
  if (!content) return '';

  // Replace code blocks with placeholders to protect them
  const codeBlocks: Array<{ code: string; lang?: string }> = [];
  let processedContent = content.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    (_, lang, code) => {
      const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
      codeBlocks.push({ code, lang });
      return placeholder;
    }
  );

  // Replace inline code with placeholders
  const inlineCodes: string[] = [];
  processedContent = processedContent.replace(/`([^`]+)`/g, (_, code) => {
    const placeholder = `__INLINE_CODE_${inlineCodes.length}__`;
    inlineCodes.push(code);
    return placeholder;
  });

  // Process block LaTeX
  processedContent = processedContent.replace(
    /\$\$([\s\S]+?)\$\$/g,
    (_, formula) => {
      return renderLatex(formula, true);
    }
  );

  // Process inline LaTeX
  processedContent = processedContent.replace(
    /\$([^\$\n]+?)\$/g,
    (_, formula) => {
      if (!formula.trim()) return `$${formula}$`;
      return renderLatex(formula, false);
    }
  );

  // Restore code blocks with syntax highlighting
  codeBlocks.forEach((block, index) => {
    const highlighted = highlightCode(block.code, block.lang);
    const langClass = block.lang ? ` class="language-${block.lang}"` : '';
    const html = `<pre><code${langClass}>${highlighted}</code></pre>`;
    processedContent = processedContent.replace(
      `__CODE_BLOCK_${index}__`,
      html
    );
  });

  // Restore inline code
  inlineCodes.forEach((code, index) => {
    processedContent = processedContent.replace(
      `__INLINE_CODE_${index}__`,
      `<code>${escapeHTML(code)}</code>`
    );
  });

  return processedContent;
}

// Main markdown rendering function with caching
const renderMarkdown = (content: string): string => {
  if (!content) return '';

  // Check if we already rendered this content
  if (markdownCache.has(content)) {
    // Move this key to the most recently used position
    const existingIndex = cacheKeys.indexOf(content);
    if (existingIndex > -1) {
      cacheKeys.splice(existingIndex, 1);
      cacheKeys.push(content);
    }
    return markdownCache.get(content) || '';
  }

  try {
    // Pre-process content to handle LaTeX and code blocks
    const processedContent = preProcessContent(content);

    // Convert to HTML using marked
    // Use "as string" as marked.parse can technically return a Promise in some configurations
    const html = marked.parse(processedContent) as string;

    // Sanitize the result with DOMPurify
    const sanitized = DOMPurify.sanitize(html, purifyConfig);

    // Cache the result
    addToCache(content, sanitized);

    return sanitized;
  } catch (error) {
    console.error('Markdown rendering error:', error);
    return `<pre>${escapeHTML(content)}</pre>`;
  }
};

// Memoized markdown renderer component
const MarkdownRenderer = React.memo(
  ({ content }: { content: string }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    // Render the markdown to HTML with memoization
    const html = useMemo(() => {
      // Using a small hash for very large contents can improve memoization performance
      if (content && content.length > 10000) {
        const hashKey = `${content.length}_${content.substring(0, 100)}_${content.substring(content.length - 100)}`;
        if (markdownCache.has(hashKey)) {
          return markdownCache.get(hashKey) || '';
        }
        const rendered = renderMarkdown(content);
        addToCache(hashKey, rendered);
        return rendered;
      }
      return renderMarkdown(content);
    }, [content]);

    // Handle clicks on links
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const handleClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const link = target.closest('a');

        if (link && link.href && !link.href.startsWith('javascript:')) {
          e.preventDefault();
          openExternalLink(link.href);
        }
      };

      container.addEventListener('click', handleClick);
      return () => {
        container.removeEventListener('click', handleClick);
      };
    }, []);

    // Early return for empty content
    if (!content) {
      return (
        <div className="prose prose-slate dark:prose-invert max-w-none"></div>
      );
    }

    return (
      <div
        ref={containerRef}
        className="prose prose-slate dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function for memoization
    // Only re-render if the content has actually changed
    return prevProps.content === nextProps.content;
  }
);

MarkdownRenderer.displayName = 'MarkdownRenderer';

export default MarkdownRenderer;
