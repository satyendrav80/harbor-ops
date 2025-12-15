import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { RichTextRenderer } from '../../src/components/common/RichTextRenderer';

describe('RichTextRenderer', () => {
  describe('List rendering', () => {
    it('should render bullet lists with proper formatting', () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const { container } = render(<RichTextRenderer html={html} />);
      
      const ul = container.querySelector('ul');
      const lis = container.querySelectorAll('li');
      
      expect(ul).toBeTruthy();
      expect(lis).toHaveLength(2);
      expect(lis[0].textContent).toBe('Item 1');
      expect(lis[1].textContent).toBe('Item 2');
      
      // Check that the wrapper has list styling classes
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('[&_ul]:list-disc');
      expect(wrapper.className).toContain('[&_ol]:list-decimal');
    });

    it('should render numbered lists with proper formatting', () => {
      const html = '<ol><li>First</li><li>Second</li></ol>';
      const { container } = render(<RichTextRenderer html={html} />);
      
      const ol = container.querySelector('ol');
      const lis = container.querySelectorAll('li');
      
      expect(ol).toBeTruthy();
      expect(lis).toHaveLength(2);
      expect(lis[0].textContent).toBe('First');
      expect(lis[1].textContent).toBe('Second');
    });
  });

  describe('Quote prefix removal', () => {
    it('should strip comment quote prefix when stripQuotePrefix is true', () => {
      const html = '[[quote:123]]\n<p>This is the actual content</p>';
      const { container } = render(
        <RichTextRenderer html={html} stripQuotePrefix={true} />
      );
      
      const text = container.textContent || '';
      expect(text).not.toContain('[[quote:123]]');
      expect(text).toContain('This is the actual content');
    });

    it('should not strip quote prefix when stripQuotePrefix is false', () => {
      const html = '[[quote:123]]\n<p>This is the actual content</p>';
      const { container } = render(
        <RichTextRenderer html={html} stripQuotePrefix={false} />
      );
      
      // The quote prefix should be sanitized away (not valid HTML), but content should remain
      const text = container.textContent || '';
      expect(text).toContain('This is the actual content');
    });
  });

  describe('XSS protection', () => {
    it('should remove script tags', () => {
      const html = '<p>Safe content</p><script>alert("XSS")</script>';
      const { container } = render(<RichTextRenderer html={html} />);
      
      const scripts = container.querySelectorAll('script');
      expect(scripts).toHaveLength(0);
      expect(container.textContent).toContain('Safe content');
    });

    it('should remove dangerous event handlers', () => {
      const html = '<p onerror="alert(1)">Content</p>';
      const { container } = render(<RichTextRenderer html={html} />);
      
      const p = container.querySelector('p');
      expect(p).toBeTruthy();
      expect(p?.getAttribute('onerror')).toBeNull();
      expect(p?.textContent).toBe('Content');
    });

    it('should sanitize javascript: URLs in links', () => {
      const html = '<a href="javascript:alert(1)">Click me</a>';
      const { container } = render(<RichTextRenderer html={html} />);
      
      const link = container.querySelector('a');
      expect(link).toBeTruthy();
      const href = link?.getAttribute('href');
      // href may be null/removed entirely or rewritten, but it must never contain "javascript:"
      expect(href ?? '').not.toContain('javascript:');
    });

    it('should allow safe http/https links', () => {
      const html = '<a href="https://example.com">Safe link</a>';
      const { container } = render(<RichTextRenderer html={html} />);
      
      const link = container.querySelector('a');
      expect(link).toBeTruthy();
      expect(link?.getAttribute('href')).toBe('https://example.com');
      expect(link?.textContent).toBe('Safe link');
    });
  });

  describe('Formatting preservation', () => {
    it('should preserve bold text', () => {
      const html = '<p><strong>Bold text</strong></p>';
      const { container } = render(<RichTextRenderer html={html} />);
      
      const strong = container.querySelector('strong');
      expect(strong).toBeTruthy();
      expect(strong?.textContent).toBe('Bold text');
    });

    it('should preserve italic text', () => {
      const html = '<p><em>Italic text</em></p>';
      const { container } = render(<RichTextRenderer html={html} />);
      
      const em = container.querySelector('em');
      expect(em).toBeTruthy();
      expect(em?.textContent).toBe('Italic text');
    });

    it('should preserve links with proper styling', () => {
      const html = '<p><a href="https://example.com">Link text</a></p>';
      const { container } = render(<RichTextRenderer html={html} />);
      
      const link = container.querySelector('a');
      expect(link).toBeTruthy();
      expect(link?.getAttribute('href')).toBe('https://example.com');
      
      // Check that wrapper has link styling classes
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('[&_a]:text-primary');
    });
  });

  describe('Empty/null handling', () => {
    it('should render nothing for null html', () => {
      const { container } = render(<RichTextRenderer html={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render nothing for empty string', () => {
      const { container } = render(<RichTextRenderer html="" />);
      expect(container.firstChild).toBeNull();
    });

    it('should render nothing for undefined html', () => {
      const { container } = render(<RichTextRenderer html={undefined} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render nothing for empty paragraph tags', () => {
      const { container } = render(<RichTextRenderer html="<p></p>" />);
      expect(container.firstChild).toBeNull();
    });

    it('should render nothing for paragraph with only br tag', () => {
      const { container } = render(<RichTextRenderer html="<p><br></p>" />);
      expect(container.firstChild).toBeNull();
    });

    it('should render nothing for paragraph with self-closing br tag', () => {
      const { container } = render(<RichTextRenderer html="<p><br/></p>" />);
      expect(container.firstChild).toBeNull();
    });

    it('should render nothing for whitespace-only content', () => {
      const { container } = render(<RichTextRenderer html="<p>   </p>" />);
      expect(container.firstChild).toBeNull();
    });

    it('should render nothing for paragraph with only non-breaking spaces', () => {
      const { container } = render(<RichTextRenderer html="<p>&nbsp;</p>" />);
      expect(container.firstChild).toBeNull();
    });

    it('should render nothing for paragraph with whitespace and br', () => {
      const { container } = render(<RichTextRenderer html="<p> <br> </p>" />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Variant styling', () => {
    it('should apply default variant classes', () => {
      const html = '<p>Content</p>';
      const { container } = render(<RichTextRenderer html={html} variant="default" />);
      
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('text-gray-700');
      expect(wrapper.className).toContain('dark:text-gray-300');
    });

    it('should apply compact variant classes', () => {
      const html = '<p>Content</p>';
      const { container } = render(<RichTextRenderer html={html} variant="compact" />);
      
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('text-xs');
      expect(wrapper.className).toContain('text-gray-600');
    });

    it('should apply muted variant classes', () => {
      const html = '<p>Content</p>';
      const { container } = render(<RichTextRenderer html={html} variant="muted" />);
      
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('text-sm');
      expect(wrapper.className).toContain('text-gray-600');
    });
  });

  describe('Custom className', () => {
    it('should merge custom className with default classes', () => {
      const html = '<p>Content</p>';
      const { container } = render(
        <RichTextRenderer html={html} className="custom-class" />
      );
      
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('custom-class');
      expect(wrapper.className).toContain('prose');
    });
  });
});

