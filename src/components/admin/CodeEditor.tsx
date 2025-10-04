import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  Code, 
  Search, 
  File, 
  Folder, 
  FolderOpen, 
  Save, 
  Download,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export function CodeEditor() {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    // Initialize with some common project files
    // In a real implementation, this would fetch from the actual file system
    const mockFiles: FileNode[] = [
      {
        name: 'src',
        path: 'src',
        type: 'directory',
        children: [
          {
            name: 'components',
            path: 'src/components',
            type: 'directory',
            children: [
              { name: 'ui', path: 'src/components/ui', type: 'directory' },
              { name: 'admin', path: 'src/components/admin', type: 'directory' },
              { name: 'ZettelCard.tsx', path: 'src/components/ZettelCard.tsx', type: 'file' },
              { name: 'Dashboard.tsx', path: 'src/components/Dashboard.tsx', type: 'file' },
            ]
          },
          {
            name: 'pages',
            path: 'src/pages',
            type: 'directory',
            children: [
              { name: 'Index.tsx', path: 'src/pages/Index.tsx', type: 'file' },
              { name: 'Auth.tsx', path: 'src/pages/Auth.tsx', type: 'file' },
              { name: 'Admin.tsx', path: 'src/pages/Admin.tsx', type: 'file' },
            ]
          },
          { name: 'App.tsx', path: 'src/App.tsx', type: 'file' },
          { name: 'main.tsx', path: 'src/main.tsx', type: 'file' },
          { name: 'index.css', path: 'src/index.css', type: 'file' },
        ]
      },
      {
        name: 'supabase',
        path: 'supabase',
        type: 'directory',
        children: [
          {
            name: 'functions',
            path: 'supabase/functions',
            type: 'directory',
            children: [
              { name: 'ai-edit-card', path: 'supabase/functions/ai-edit-card', type: 'directory' },
              { name: 'transcribe-audio-ai', path: 'supabase/functions/transcribe-audio-ai', type: 'directory' },
            ]
          },
          { name: 'config.toml', path: 'supabase/config.toml', type: 'file' },
        ]
      },
      { name: 'package.json', path: 'package.json', type: 'file' },
      { name: 'README.md', path: 'README.md', type: 'file' },
      { name: 'tailwind.config.ts', path: 'tailwind.config.ts', type: 'file' },
      { name: 'vite.config.ts', path: 'vite.config.ts', type: 'file' },
    ];

    setFiles(mockFiles);
    setExpandedFolders(new Set(['src', 'src/components', 'src/pages']));
  }, []);

  const handleFileSelect = async (filePath: string) => {
    setSelectedFile(filePath);
    setLoading(true);

    try {
      // Fetch the actual file content from the server
      const response = await fetch(`/${filePath}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }
      
      const content = await response.text();
      setFileContent(content);
      
      toast({
        title: "File Loaded",
        description: `Successfully loaded ${filePath}`,
      });
    } catch (error) {
      console.error('Error loading file:', error);
      setFileContent(`// Error loading file: ${filePath}
// The file might not be accessible or doesn't exist.
// 
// Note: Only publicly accessible files can be viewed in this editor.
// Some files may require backend access to view.`);
      
      toast({
        title: "Error",
        description: `Failed to load ${filePath}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadFile = () => {
    if (!selectedFile || !fileContent) return;

    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.split('/').pop() || 'file.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "File Downloaded",
      description: `Downloaded ${selectedFile}`,
    });
  };

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderPath)) {
        newSet.delete(folderPath);
      } else {
        newSet.add(folderPath);
      }
      return newSet;
    });
  };

  const renderFileTree = (nodes: FileNode[], level = 0): React.ReactNode => {
    return nodes
      .filter(node => 
        searchTerm === '' || 
        node.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .map(node => (
        <div key={node.path} style={{ marginLeft: `${level * 20}px` }}>
          {node.type === 'directory' ? (
            <div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start p-1 h-7"
                onClick={() => toggleFolder(node.path)}
              >
                {expandedFolders.has(node.path) ? (
                  <FolderOpen className="h-4 w-4 mr-2" />
                ) : (
                  <Folder className="h-4 w-4 mr-2" />
                )}
                {node.name}
              </Button>
              {expandedFolders.has(node.path) && node.children && (
                <div>
                  {renderFileTree(node.children, level + 1)}
                </div>
              )}
            </div>
          ) : (
            <Button
              variant={selectedFile === node.path ? "secondary" : "ghost"}
              size="sm"
              className="w-full justify-start p-1 h-7"
              onClick={() => handleFileSelect(node.path)}
            >
              <File className="h-4 w-4 mr-2" />
              {node.name}
            </Button>
          )}
        </div>
      ));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
      {/* File Explorer */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            File Explorer
          </CardTitle>
          <div className="space-y-2">
            <Label htmlFor="search">Search Files</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] w-full">
            <div className="space-y-1">
              {renderFileTree(files)}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Code Editor */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Code Editor
              </CardTitle>
              <CardDescription>
                {selectedFile ? `Editing: ${selectedFile}` : 'Select a file to edit'}
              </CardDescription>
            </div>
            {selectedFile && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleDownloadFile}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {selectedFile ? (
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                  Loading file content...
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="text-sm text-muted-foreground">
                      Read-only mode. File editing is disabled for safety. Use your preferred code editor for modifications.
                    </span>
                  </div>
                  <Textarea
                    value={fileContent}
                    readOnly
                    className="font-mono text-sm min-h-[400px] resize-none bg-muted/30"
                    placeholder="File content will appear here..."
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 text-center">
              <div>
                <File className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No File Selected</h3>
                <p className="text-muted-foreground">
                  Select a file from the explorer to start editing
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}