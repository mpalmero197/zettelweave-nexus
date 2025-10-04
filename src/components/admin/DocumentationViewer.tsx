import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { toast } from 'sonner';

export function DocumentationViewer() {
  const [readmeContent, setReadmeContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReadme();
  }, []);

  const fetchReadme = async () => {
    try {
      // Try fetching from root first (for production), then from public folder
      let response = await fetch('/README.md');
      if (!response.ok) {
        // Fallback to fetching from GitHub or showing error
        throw new Error('README not accessible');
      }
      const text = await response.text();
      setReadmeContent(text);
    } catch (error) {
      console.error('Error loading README:', error);
      setReadmeContent(`# PendragonX Documentation

## Overview
PendragonX is an advanced knowledge management system with features including:

- Zettelkasten cards with multiple organization methods
- Notes and notebooks
- File management
- Visual knowledge graphs
- AI-powered features
- And much more!

## Getting Started
Create your first Zettelkasten card to begin organizing your knowledge.

*Note: Full README documentation is available in the project repository.*`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([readmeContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'README.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('README downloaded');
  };

  const renderMarkdown = (markdown: string) => {
    return markdown
      .split('\n')
      .map((line, index) => {
        // Headers
        if (line.startsWith('# ')) {
          return (
            <h1 key={index} className="text-3xl font-bold mt-6 mb-4 text-foreground">
              {line.replace('# ', '')}
            </h1>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h2 key={index} className="text-2xl font-bold mt-5 mb-3 text-foreground">
              {line.replace('## ', '')}
            </h2>
          );
        }
        if (line.startsWith('### ')) {
          return (
            <h3 key={index} className="text-xl font-semibold mt-4 mb-2 text-foreground">
              {line.replace('### ', '')}
            </h3>
          );
        }
        if (line.startsWith('#### ')) {
          return (
            <h4 key={index} className="text-lg font-semibold mt-3 mb-2 text-foreground">
              {line.replace('#### ', '')}
            </h4>
          );
        }

        // Lists
        if (line.startsWith('- ')) {
          return (
            <li key={index} className="ml-6 mb-1 text-foreground">
              {line.replace('- ', '')}
            </li>
          );
        }

        // Code blocks
        if (line.startsWith('```')) {
          return (
            <div key={index} className="bg-muted rounded p-1 my-2 font-mono text-sm">
              {line.replace(/```/g, '')}
            </div>
          );
        }

        // Bold
        const boldRegex = /\*\*(.+?)\*\*/g;
        if (boldRegex.test(line)) {
          const parts = line.split(boldRegex);
          return (
            <p key={index} className="mb-2 text-foreground">
              {parts.map((part, i) =>
                i % 2 === 1 ? <strong key={i}>{part}</strong> : part
              )}
            </p>
          );
        }

        // Inline code
        const codeRegex = /`(.+?)`/g;
        if (codeRegex.test(line)) {
          const parts = line.split(codeRegex);
          return (
            <p key={index} className="mb-2 text-foreground">
              {parts.map((part, i) =>
                i % 2 === 1 ? (
                  <code key={i} className="bg-muted px-1 rounded font-mono text-sm">
                    {part}
                  </code>
                ) : (
                  part
                )
              )}
            </p>
          );
        }

        // Horizontal rule
        if (line === '---') {
          return <hr key={index} className="my-4 border-border" />;
        }

        // Empty line
        if (line.trim() === '') {
          return <div key={index} className="h-2" />;
        }

        // Regular paragraph
        return (
          <p key={index} className="mb-2 text-foreground">
            {line}
          </p>
        );
      });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            System Documentation
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download README
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] w-full rounded-md border p-4">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {renderMarkdown(readmeContent)}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
