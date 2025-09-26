import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ZettelCard } from '@/types/zettel';

export const exportToPDF = (cards: ZettelCard[], title: string = "Zettel Cards") => {
  try {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const lineHeight = 7;
    let yPosition = margin;

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, yPosition);
    yPosition += lineHeight * 2;

    // Date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, yPosition);
    yPosition += lineHeight * 2;

    cards.forEach((card, index) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 50) {
        doc.addPage();
        yPosition = margin;
      }

      // Card number and title
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      const cardHeader = `${card.number ? `[${card.number}] ` : ''}${card.title}`;
      doc.text(cardHeader, margin, yPosition);
      yPosition += lineHeight;

      // Category and tags
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      const metadata = `Category: ${card.category} | Tags: ${card.tags.join(', ')}`;
      doc.text(metadata, margin, yPosition);
      yPosition += lineHeight;

      // Description
      if (card.description) {
        doc.setFont('helvetica', 'normal');
        doc.text(`Description: ${card.description}`, margin, yPosition);
        yPosition += lineHeight;
      }

      // Content
      doc.setFont('helvetica', 'normal');
      const content = card.content.replace(/\n/g, ' ');
      const splitContent = doc.splitTextToSize(content, pageWidth - 2 * margin);
      
      splitContent.forEach((line: string) => {
        if (yPosition > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += lineHeight;
      });

      // Linked cards
      if (card.linkedCards && card.linkedCards.length > 0) {
        yPosition += lineHeight / 2;
        doc.setFont('helvetica', 'italic');
        doc.text(`Linked Cards: ${card.linkedCards.join(', ')}`, margin, yPosition);
        yPosition += lineHeight;
      }

      // Dates
      yPosition += lineHeight / 2;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Created: ${card.created.toLocaleDateString()} | Modified: ${card.modified.toLocaleDateString()}`, margin, yPosition);
      yPosition += lineHeight * 2;

      // Separator line
      if (index < cards.length - 1) {
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += lineHeight;
      }
    });

    // Save the PDF
    doc.save(`${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  }
};

export const exportToJSON = (cards: ZettelCard[], filename: string = "zettel_cards") => {
  try {
    const dataStr = JSON.stringify(cards, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting to JSON:', error);
    throw new Error('Failed to export to JSON');
  }
};

export const exportToMarkdown = (cards: ZettelCard[], filename: string = "zettel_cards") => {
  try {
    let markdown = `# Zettel Cards Export\n\n`;
    markdown += `Generated on: ${new Date().toLocaleDateString()}\n\n`;
    markdown += `Total Cards: ${cards.length}\n\n---\n\n`;

    cards.forEach((card, index) => {
      markdown += `## ${card.number ? `[${card.number}] ` : ''}${card.title}\n\n`;
      
      if (card.description) {
        markdown += `**Description:** ${card.description}\n\n`;
      }
      
      markdown += `**Category:** ${card.category}\n\n`;
      markdown += `**Tags:** ${card.tags.join(', ')}\n\n`;
      
      markdown += `### Content\n\n${card.content}\n\n`;
      
      if (card.linkedCards && card.linkedCards.length > 0) {
        markdown += `**Linked Cards:** ${card.linkedCards.join(', ')}\n\n`;
      }
      
      markdown += `**Created:** ${card.created.toLocaleDateString()}\n\n`;
      markdown += `**Modified:** ${card.modified.toLocaleDateString()}\n\n`;
      
      if (index < cards.length - 1) {
        markdown += `---\n\n`;
      }
    });

    const dataBlob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting to Markdown:', error);
    throw new Error('Failed to export to Markdown');
  }
};

export const exportToTXT = (cards: ZettelCard[], filename: string = "zettel_cards") => {
  try {
    let text = `ZETTEL CARDS EXPORT\n`;
    text += `===================\n\n`;
    text += `Generated on: ${new Date().toLocaleDateString()}\n`;
    text += `Total Cards: ${cards.length}\n\n`;

    cards.forEach((card, index) => {
      text += `${'-'.repeat(50)}\n`;
      text += `${card.number ? `[${card.number}] ` : ''}${card.title}\n`;
      text += `${'-'.repeat(50)}\n\n`;
      
      if (card.description) {
        text += `Description: ${card.description}\n\n`;
      }
      
      text += `Category: ${card.category}\n`;
      text += `Tags: ${card.tags.join(', ')}\n\n`;
      
      text += `Content:\n${card.content}\n\n`;
      
      if (card.linkedCards && card.linkedCards.length > 0) {
        text += `Linked Cards: ${card.linkedCards.join(', ')}\n\n`;
      }
      
      text += `Created: ${card.created.toLocaleDateString()}\n`;
      text += `Modified: ${card.modified.toLocaleDateString()}\n\n`;
    });

    const dataBlob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting to TXT:', error);
    throw new Error('Failed to export to TXT');
  }
};

export const printCards = (cards: ZettelCard[]) => {
  try {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Could not open print window');
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Zettel Cards - Print</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              line-height: 1.6;
            }
            .card {
              border: 1px solid #ccc;
              margin-bottom: 20px;
              padding: 15px;
              border-radius: 5px;
              page-break-inside: avoid;
            }
            .card-header {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 10px;
              color: #333;
            }
            .card-meta {
              font-size: 12px;
              color: #666;
              margin-bottom: 10px;
            }
            .card-content {
              margin-bottom: 10px;
              white-space: pre-wrap;
            }
            .card-footer {
              font-size: 10px;
              color: #999;
              border-top: 1px solid #eee;
              padding-top: 5px;
            }
            @media print {
              body { margin: 0; }
              .card { margin-bottom: 15px; }
            }
          </style>
        </head>
        <body>
          <h1>Zettel Cards</h1>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
          <p>Total Cards: ${cards.length}</p>
          <hr>
          ${cards.map(card => `
            <div class="card">
              <div class="card-header">
                ${card.number ? `[${card.number}] ` : ''}${card.title}
              </div>
              <div class="card-meta">
                Category: ${card.category} | Tags: ${card.tags.join(', ')}
                ${card.description ? `<br>Description: ${card.description}` : ''}
              </div>
              <div class="card-content">${card.content}</div>
              ${card.linkedCards && card.linkedCards.length > 0 ? 
                `<div class="card-meta">Linked Cards: ${card.linkedCards.join(', ')}</div>` : ''
              }
              <div class="card-footer">
                Created: ${card.created.toLocaleDateString()} | 
                Modified: ${card.modified.toLocaleDateString()}
              </div>
            </div>
          `).join('')}
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  } catch (error) {
    console.error('Error printing cards:', error);
    throw new Error('Failed to print cards');
  }
};

export const shareToSocial = async (card: ZettelCard, platform: 'twitter' | 'linkedin' | 'facebook') => {
  const text = `${card.title}\n\n${card.description || card.content.substring(0, 200)}...`;
  const url = window.location.href;

  const shareUrls = {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
  };

  window.open(shareUrls[platform], '_blank', 'width=600,height=400');
};

export const exportCardAsImage = async (cardElement: HTMLElement, filename: string) => {
  try {
    const canvas = await html2canvas(cardElement, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true
    });
    
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL();
    link.click();
  } catch (error) {
    console.error('Error exporting card as image:', error);
  }
};