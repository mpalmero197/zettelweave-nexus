import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import Epub from 'epub-gen-memory';

export const exportCatalystToPDF = (title: string, content: string, themeId: string = 'default') => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - (margin * 2);
  
  let fontName = themeId === 'classic' ? 'times' : themeId === 'technical' ? 'courier' : 'helvetica';
  
  // Title
  doc.setFontSize(20);
  doc.setFont(fontName, 'bold');
  if (themeId === 'modern') doc.setTextColor(20, 100, 200); 
  doc.text(title, margin, 20);
  
  // Date
  doc.setFontSize(10);
  doc.setFont(fontName, 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, 30);
  
  // Content - strip HTML tags for PDF
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont(fontName, 'normal');
  const plainText = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
  const lines = doc.splitTextToSize(plainText, maxWidth);
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

export const exportCatalystToDOCX = async (title: string, content: string, themeId: string = 'default') => {
  // Strip HTML tags for DOCX
  const plainText = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
  
  let fontName = 'Arial';
  if (themeId === 'classic') fontName = 'Times New Roman';
  if (themeId === 'modern') fontName = 'Helvetica';
  if (themeId === 'technical') fontName = 'Courier New';
  if (themeId === 'creative') fontName = 'Georgia';
  
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
              font: fontName,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Generated: ${new Date().toLocaleDateString()}`,
              size: 20,
              italics: true,
              font: fontName,
            }),
          ],
        }),
        new Paragraph({ text: '' }), // Empty line
        ...plainText.split('\n').map(line => 
          new Paragraph({
            children: [
              new TextRun({
                text: line,
                size: 24,
                font: fontName,
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
  const contentHtml = `<h1>${title}</h1><p><em>Generated: ${new Date().toLocaleDateString()}</em></p>${content}`;
  
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

export const exportCatalystToKPF = async (title: string, content: string) => {
  // KPF (Kindle Package Format) is essentially a structured ZIP with HTML
  // For simplicity, we'll create a basic MOBI-compatible HTML package
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        body { font-family: Georgia, serif; line-height: 1.6; margin: 2em; }
        h1 { font-size: 2em; margin-bottom: 0.5em; }
        h2 { font-size: 1.5em; margin-top: 1.5em; }
        h3 { font-size: 1.2em; margin-top: 1.2em; }
        p { margin-bottom: 1em; text-align: justify; }
        blockquote { margin-left: 2em; font-style: italic; }
        img { max-width: 100%; height: auto; }
    </style>
</head>
<body>
    <h1>${title}</h1>
    <p><em>Generated: ${new Date().toLocaleDateString()}</em></p>
    <hr>
    ${content}
</body>
</html>
  `;

  // Create a blob and download as .html (Kindle can convert HTML)
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/\s+/g, '_')}_kindle.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
