import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Download, Trash2, Bug, AlertTriangle, Info, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LogEntry {
  id: string;
  timestamp: number;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  stack?: string;
  context?: Record<string, any>;
  userAgent?: string;
  url?: string;
}

class DebugLoggerService {
  private static instance: DebugLoggerService;
  private logs: LogEntry[] = [];
  private listeners: ((logs: LogEntry[]) => void)[] = [];
  private maxLogs = 1000;

  static getInstance(): DebugLoggerService {
    if (!DebugLoggerService.instance) {
      DebugLoggerService.instance = new DebugLoggerService();
      DebugLoggerService.instance.initialize();
    }
    return DebugLoggerService.instance;
  }

  private initialize() {
    // Override console methods to capture logs
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalLog = console.log;
    const originalInfo = console.info;

    console.error = (...args) => {
      this.addLog('error', args.join(' '), new Error().stack);
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      this.addLog('warn', args.join(' '));
      originalWarn.apply(console, args);
    };

    console.info = (...args) => {
      this.addLog('info', args.join(' '));
      originalInfo.apply(console, args);
    };

    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      this.addLog('error', event.message, event.error?.stack, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.addLog('error', `Unhandled Promise Rejection: ${event.reason}`, event.reason?.stack);
    });

    // Capture React errors (if using React error boundaries)
    const originalOnError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      this.addLog('error', message?.toString() || 'Unknown error', error?.stack, {
        source,
        lineno,
        colno
      });
      return originalOnError ? originalOnError(message, source, lineno, colno, error) : false;
    };
  }

  addLog(level: LogEntry['level'], message: string, stack?: string, context?: Record<string, any>) {
    const logEntry: LogEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      level,
      message,
      stack,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.logs.unshift(logEntry);
    
    // Limit log size
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    this.notifyListeners();
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
    this.notifyListeners();
  }

  subscribe(listener: (logs: LogEntry[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.logs]));
  }

  exportLogs(): string {
    const exportData = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      logs: this.logs
    };
    
    return JSON.stringify(exportData, null, 2);
  }
}

export function DebugLogger({ onClose }: { onClose: () => void }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LogEntry['level'] | 'all'>('all');
  const { toast } = useToast();

  useEffect(() => {
    const logger = DebugLoggerService.getInstance();
    setLogs(logger.getLogs());
    
    const unsubscribe = logger.subscribe(setLogs);
    return unsubscribe;
  }, []);

  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.level === filter);

  const getLevelIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warn': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <Info className="h-4 w-4 text-blue-500" />;
      default: return <Bug className="h-4 w-4 text-gray-500" />;
    }
  };

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return 'destructive';
      case 'warn': return 'outline';
      case 'info': return 'secondary';
      default: return 'outline';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const copyLogs = () => {
    const logger = DebugLoggerService.getInstance();
    const exported = logger.exportLogs();
    navigator.clipboard.writeText(exported);
    toast({
      title: "Logs Copied",
      description: "Debug logs have been copied to clipboard"
    });
  };

  const downloadLogs = () => {
    const logger = DebugLoggerService.getInstance();
    const exported = logger.exportLogs();
    const blob = new Blob([exported], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Logs Downloaded",
      description: "Debug logs have been saved to file"
    });
  };

  const clearLogs = () => {
    const logger = DebugLoggerService.getInstance();
    logger.clearLogs();
    toast({
      title: "Logs Cleared",
      description: "All debug logs have been removed"
    });
  };

  const errorCount = logs.filter(log => log.level === 'error').length;
  const warnCount = logs.filter(log => log.level === 'warn').length;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] bg-card/95 backdrop-blur-md">
        <CardHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Debug Logger
              <Badge variant="outline">{logs.length} entries</Badge>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Controls */}
          <div className="p-4 border-b bg-muted/30">
            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={filter === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilter('all')}
                >
                  All <Badge variant="secondary" className="ml-1">{logs.length}</Badge>
                </Button>
                <Button
                  size="sm"
                  variant={filter === 'error' ? 'default' : 'outline'}
                  onClick={() => setFilter('error')}
                  disabled={errorCount === 0}
                >
                  Errors <Badge variant="destructive" className="ml-1">{errorCount}</Badge>
                </Button>
                <Button
                  size="sm"
                  variant={filter === 'warn' ? 'default' : 'outline'}
                  onClick={() => setFilter('warn')}
                  disabled={warnCount === 0}
                >
                  Warnings <Badge variant="outline" className="ml-1">{warnCount}</Badge>
                </Button>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={copyLogs}>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
                <Button size="sm" variant="outline" onClick={downloadLogs}>
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
                <Button size="sm" variant="outline" onClick={clearLogs}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
            </div>
          </div>

          {/* Log Entries */}
          <ScrollArea className="h-[500px]">
            <div className="p-4 space-y-2">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No logs found
                </div>
              ) : (
                filteredLogs.map(log => (
                  <Card key={log.id} className="p-3">
                    <div className="flex items-start gap-3">
                      {getLevelIcon(log.level)}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={getLevelColor(log.level) as any} className="capitalize">
                            {log.level}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(log.timestamp)}
                          </span>
                        </div>
                        
                        <p className="text-sm font-mono break-words">
                          {log.message}
                        </p>
                        
                        {log.stack && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                              Stack trace
                            </summary>
                            <pre className="text-xs text-muted-foreground mt-1 overflow-x-auto">
                              {log.stack}
                            </pre>
                          </details>
                        )}
                        
                        {log.context && Object.keys(log.context).length > 0 && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                              Context
                            </summary>
                            <pre className="text-xs text-muted-foreground mt-1 overflow-x-auto">
                              {JSON.stringify(log.context, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// Export the singleton instance for manual logging
export const debugLogger = DebugLoggerService.getInstance();