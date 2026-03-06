import mammoth from 'mammoth';
import { readEnexFile } from './evernoteImport';

export interface ImportedFile {
  name: string;
  content: string;
  type: string;
}

export async function importFile(file: File): Promise<ImportedFile> {
  const fileType = file.type || getFileTypeFromName(file.name);
  
  if (file.name.endsWith('.docx')) {
    return await importDOCX(file);
  } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
    return await importPDF(file);
  } else if (file.type.startsWith('image/') || file.name.match(/\.(jpg|jpeg|png|gif|bmp|tiff|tif|webp)$/i)) {
    return await importImage(file);
  } else if (file.name.match(/\.(txt|md|markdown)$/i)) {
    return await importText(file);
  } else if (file.name.endsWith('.dta')) {
    return await importDTA(file);
  } else if (file.name.endsWith('.enex')) {
    return await importENEX(file);
  } else {
    // Try as text
    return await importText(file);
  }
}

function getFileTypeFromName(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    'txt': 'text/plain',
    'md': 'text/markdown',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'pdf': 'application/pdf',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'tiff': 'image/tiff',
    'tif': 'image/tiff',
    'dta': 'application/octet-stream',
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
}

async function importText(file: File): Promise<ImportedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      resolve({
        name: file.name,
        content: `<h3>Imported from ${file.name}</h3><p>${content.replace(/\n/g, '<br>')}</p>`,
        type: 'text',
      });
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

async function importDOCX(file: File): Promise<ImportedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const result = await mammoth.convertToHtml({ arrayBuffer });
        resolve({
          name: file.name,
          content: `<h3>Imported from ${file.name}</h3>${result.value}`,
          type: 'docx',
        });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

async function importPDF(file: File): Promise<ImportedFile> {
  // For PDF, we'll extract text using a simple approach
  // Note: This is a placeholder - full PDF parsing requires pdf-parse or similar
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      // Simple text extraction - in production, use pdf-parse library
      const content = `<h3>Imported from ${file.name}</h3><p><em>PDF content extraction requires server-side processing. File has been referenced.</em></p>`;
      resolve({
        name: file.name,
        content,
        type: 'pdf',
      });
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

async function importImage(file: File): Promise<ImportedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      resolve({
        name: file.name,
        content: `<h3>Image: ${file.name}</h3><img src="${dataUrl}" alt="${file.name}" style="max-width: 100%;" />`,
        type: 'image',
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function importDTA(file: File): Promise<ImportedFile> {
  // DTA (Stata data files) are binary - we'll just reference them
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        resolve({
          name: file.name,
          content: `<h3>Data File: ${file.name}</h3><pre>${text.substring(0, 1000)}</pre><p><em>Data file preview truncated. Full statistical analysis requires specialized software.</em></p>`,
          type: 'dta',
        });
      } catch (error) {
        resolve({
          name: file.name,
          content: `<h3>Data File: ${file.name}</h3><p><em>Binary data file referenced. Size: ${(file.size / 1024).toFixed(2)} KB</em></p>`,
          type: 'dta',
        });
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

async function importENEX(file: File): Promise<ImportedFile> {
  const notes = await readEnexFile(file);
  const html = notes.map((n) =>
    `<h3>${n.title}</h3>${n.content}${n.tags.length > 0 ? `<p><em>Tags: ${n.tags.join(', ')}</em></p>` : ''}`
  ).join('<hr/>');
  return {
    name: file.name,
    content: `<h3>Imported from ${file.name} (${notes.length} notes)</h3>${html}`,
    type: 'enex',
  };
}

export function getSupportedFileTypes(): string {
  return '.txt,.md,.docx,.pdf,.jpg,.jpeg,.png,.gif,.tiff,.tif,.bmp,.webp,.dta,.enex';
}
