import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import Epub from 'epub-gen-memory';

export const exportCatalystToPDF = (title: string, content: string) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - (margin * 2);
  
  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin, 20);
  
  // Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, 30);
  
  // Content
  doc.setFontSize(12);
  const lines = doc.splitTextToSize(content, maxWidth);
  let y = 40;
  const lineHeight = 7;
  const pageHeight = doc.internal.pageSize.getHeight();
  
  lines.forEach((line: string) => {
    if (y + lineHeight > pageHeight - margin) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, margin, y);
    y += lineHeight;
  });
  
  doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
};

export const exportCatalystToDOCX = async (title: string, content: string) => {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: title,
              bold: true,
              size: 32,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Generated: ${new Date().toLocaleDateString()}`,
              size: 20,
              italics: true,
            }),
          ],
        }),
        new Paragraph({ text: '' }), // Empty line
        ...content.split('\n').map(line => 
          new Paragraph({
            children: [
              new TextRun({
                text: line,
                size: 24,
              }),
            ],
          })
        ),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/\s+/g, '_')}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportCatalystToEPUB = async (title: string, content: string) => {
  const contentHtml = `<h1>${title}</h1><p><em>Generated: ${new Date().toLocaleDateString()}</em></p>${content.split('\n').map(p => `<p>${p}</p>`).join('')}`;
  
  const options = {
    title: title,
    author: 'Catalyst User',
    publisher: 'Pendragon',
    content: [
      {
        title: title,
        data: contentHtml,
      },
    ],
  };

  try {
    const epub = new (Epub as any)(options);
    const epubBuffer = await epub.generate();
    const epubBlob = new Blob([epubBuffer], { type: 'application/epub+zip' });
    const url = URL.createObjectURL(epubBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}.epub`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('EPUB export error:', error);
    throw new Error('Failed to generate EPUB file');
  }
};
