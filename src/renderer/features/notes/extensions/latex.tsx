import { mergeAttributes, Node, Mark } from '@tiptap/core';
import {
  ReactNodeViewRenderer,
  NodeViewProps,
  NodeViewWrapper,
} from '@tiptap/react';
import katex from 'katex';
import React from 'react';
import { InputRule, Extension } from '@tiptap/core';
import { MarkdownSerializer, MarkdownParser } from '@tiptap/pm/markdown';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

interface MarkdownSerializerState {
  write: (text: string) => void;
  ensureNewLine: () => void;
  closeBlock: (node: ProseMirrorNode) => void;
  text: (text: string, escape?: boolean) => void;
  render: (node: ProseMirrorNode) => void;
  renderContent: (node: ProseMirrorNode) => void;
  renderInline: (parent: ProseMirrorNode) => void;
  renderList: (
    node: ProseMirrorNode,
    delim: string,
    firstDelim: string
  ) => void;
}

interface MathNodeProps {
  node: {
    attrs: {
      content: string;
    };
  };
}

// Add debounce utility
const debounce = (fn: Function, ms = 300) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function (this: any, ...args: any[]) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
};

// Function to find all LaTeX matches in text
const findLatexMatches = (text: string) => {
  const matches: {
    type: 'inline' | 'block';
    content: string;
    start: number;
    end: number;
  }[] = [];

  // Find block math - needs to be found first to avoid conflicts
  const blockRegex = /\$\$([\s\S]*?)\$\$/g;
  let match;
  while ((match = blockRegex.exec(text)) !== null) {
    matches.push({
      type: 'block',
      content: match[1],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  // Find inline math (but not inside block math)
  const inlineRegex = /\$([^\$]+?)\$/g;
  let lastEnd = 0;
  while ((match = inlineRegex.exec(text)) !== null) {
    // Check if this match is inside any block math
    const isInsideBlock = matches.some(
      (blockMatch) =>
        match!.index > blockMatch.start &&
        match!.index + match![0].length < blockMatch.end
    );

    if (!isInsideBlock) {
      matches.push({
        type: 'inline',
        content: match[1],
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  return matches;
};

// Inline LaTeX component
const InlineMathComponent: React.FC<NodeViewProps> = ({ node }) => {
  let html = '';
  try {
    html = katex.renderToString(node.attrs.content || '', {
      throwOnError: false,
      displayMode: false,
    });
  } catch (e) {
    html = node.attrs.content || '';
  }

  return (
    <NodeViewWrapper
      as="span"
      className="inline-math-wrapper"
    >
      <span
        contentEditable={false}
        className="inline-math"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </NodeViewWrapper>
  );
};

// Block LaTeX component
const BlockMathComponent: React.FC<NodeViewProps> = ({ node }) => {
  let html = '';
  try {
    html = katex.renderToString(node.attrs.content || '', {
      throwOnError: false,
      displayMode: true,
    });
  } catch (e) {
    html = node.attrs.content || '';
  }

  return (
    <NodeViewWrapper className="block-math-wrapper">
      <div
        contentEditable={false}
        className="block-math"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </NodeViewWrapper>
  );
};

// LaTeX Extension using decorations instead of replacing content
export const LaTeX = Extension.create({
  name: 'latex',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('latexRenderer'),
        props: {
          // Make sure cursor behavior works correctly
          handleDOMEvents: {
            mousedown: (view, event) => {
              const target = event.target as HTMLElement;
              if (
                target.classList.contains('inline-math-decoration') ||
                target.classList.contains('block-math-decoration') ||
                target.closest('.inline-math-decoration') ||
                target.closest('.block-math-decoration')
              ) {
                // Find the position of the clicked decoration
                const pos = view.posAtDOM(target, 0);
                if (pos !== null) {
                  // Place cursor after the LaTeX
                  const tr = view.state.tr;
                  tr.setSelection(TextSelection.create(view.state.doc, pos));
                  view.dispatch(tr);
                  return true;
                }
              }
              return false;
            },
          },
          decorations(state) {
            const { doc } = state;
            const decorations: Decoration[] = [];

            doc.descendants((node, pos) => {
              if (!node.isText) return;

              const text = node.text || '';
              const matches = findLatexMatches(text);

              for (const match of matches) {
                const from = pos + match.start;
                const to = pos + match.end;

                // First, hide the original text with an inline decoration
                const hiddenDecoration = Decoration.inline(from, to, {
                  class: 'latex-hidden',
                });

                // Then, create a replacing decoration to show the rendered LaTeX
                const replacingDecoration = Decoration.widget(from, () => {
                  const el = document.createElement(
                    match.type === 'block' ? 'div' : 'span'
                  );
                  el.className =
                    match.type === 'inline'
                      ? 'inline-math-decoration'
                      : 'block-math-decoration';
                  el.setAttribute(
                    'data-latex',
                    match.type === 'inline'
                      ? `$${match.content}$`
                      : `$$${match.content}$$`
                  );

                  try {
                    el.innerHTML = katex.renderToString(match.content, {
                      throwOnError: false,
                      displayMode: match.type === 'block',
                    });
                  } catch (e) {
                    el.textContent =
                      match.type === 'inline'
                        ? `$${match.content}$`
                        : `$$${match.content}$$`;
                  }

                  return el;
                });

                decorations.push(hiddenDecoration, replacingDecoration);
              }
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});

// Markdown parser rules for LaTeX
export const mathMarkdownConfig = {
  inlineMath: {
    name: 'inlineMath',
    token: 'inline_math',
    regexp: /\$([^$]+)\$/,
    content: 1,
  },
  blockMath: {
    name: 'blockMath',
    token: 'block_math',
    regexp: /\$\$([^$]+)\$\$/,
    content: 1,
  },
};
