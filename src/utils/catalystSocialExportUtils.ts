// Social media export utilities for Catalyst content

export const exportToBlogHTML = (title: string, content: string) => {
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${title}">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            color: #333;
        }
        h1 { font-size: 2.5em; margin-bottom: 0.5em; }
        h2 { font-size: 2em; margin-top: 1.5em; }
        h3 { font-size: 1.5em; margin-top: 1.2em; }
        p { margin-bottom: 1em; }
        blockquote {
            border-left: 4px solid #e5e7eb;
            padding-left: 1.5em;
            margin: 1.5em 0;
            font-style: italic;
            color: #666;
        }
        img { max-width: 100%; height: auto; }
        code {
            background: #f3f4f6;
            padding: 0.2em 0.4em;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }
        pre {
            background: #f3f4f6;
            padding: 1em;
            border-radius: 5px;
            overflow-x: auto;
        }
    </style>
</head>
<body>
    <article>
        <h1>${title}</h1>
        <p class="meta"><em>Published: ${new Date().toLocaleDateString()}</em></p>
        ${content}
    </article>
</body>
</html>
  `;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/\s+/g, '_')}_blog.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportToMedium = (title: string, content: string) => {
  // Medium supports Markdown
  const markdown = htmlToMarkdown(content);
  const blob = new Blob([`# ${title}\n\n${markdown}`], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/\s+/g, '_')}_medium.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportToWordPress = (title: string, content: string) => {
  // WordPress WXR format (simplified)
  const wxr = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0"
    xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
    xmlns:content="http://purl.org/rss/1.0/modules/content/"
    xmlns:wfw="http://wellformedweb.org/CommentAPI/"
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:wp="http://wordpress.org/export/1.2/">
  <channel>
    <title>Baku Scribe Export</title>
    <item>
      <title>${escapeXml(title)}</title>
      <pubDate>${new Date().toUTCString()}</pubDate>
      <dc:creator>Baku Scribe User</dc:creator>
      <content:encoded><![CDATA[${content}]]></content:encoded>
      <wp:post_type>post</wp:post_type>
      <wp:status>draft</wp:status>
    </item>
  </channel>
</rss>`;

  const blob = new Blob([wxr], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/\s+/g, '_')}_wordpress.xml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const shareToTwitter = (title: string, content: string) => {
  const plainText = content.replace(/<[^>]*>/g, '').substring(0, 250);
  const text = `${title}\n\n${plainText}...`;
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'width=550,height=420');
};

export const shareToFacebook = (title: string) => {
  // Facebook sharing requires a URL, so we'll open the share dialog
  const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(title)}`;
  window.open(url, '_blank', 'width=550,height=420');
};

export const shareToLinkedIn = (title: string, content: string) => {
  const plainText = content.replace(/<[^>]*>/g, '').substring(0, 250);
  const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`;
  window.open(url, '_blank', 'width=550,height=420');
};

export const shareToPinterest = (title: string, imageUrl?: string) => {
  const url = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(window.location.href)}&description=${encodeURIComponent(title)}${imageUrl ? `&media=${encodeURIComponent(imageUrl)}` : ''}`;
  window.open(url, '_blank', 'width=750,height=600');
};

export const exportForSubstack = (title: string, content: string) => {
  // Substack supports Markdown
  const markdown = htmlToMarkdown(content);
  const blob = new Blob([`# ${title}\n\n${markdown}`], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/\s+/g, '_')}_substack.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportForGhost = (title: string, content: string) => {
  // Ghost uses a JSON format
  const ghostJson = {
    db: [{
      meta: {
        exported_on: Date.now(),
        version: "5.0.0"
      },
      data: {
        posts: [{
          title: title,
          html: content,
          status: "draft",
          created_at: Date.now(),
          updated_at: Date.now(),
        }]
      }
    }]
  };

  const blob = new Blob([JSON.stringify(ghostJson, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/\s+/g, '_')}_ghost.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Helper functions
function htmlToMarkdown(html: string): string {
  let md = html;
  
  // Remove HTML tags and convert to markdown
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
  md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n\n');
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
  md = md.replace(/<br\s*\/?>/gi, '\n');
  md = md.replace(/<[^>]*>/g, '');
  md = md.replace(/&nbsp;/g, ' ');
  md = md.replace(/&quot;/g, '"');
  md = md.replace(/&amp;/g, '&');
  md = md.replace(/&lt;/g, '<');
  md = md.replace(/&gt;/g, '>');
  
  return md.trim();
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
