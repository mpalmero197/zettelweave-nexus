import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ZettelCard } from '@/types/zettel';

export const exportToPDF = async (cards: ZettelCard[], title: string = 'Zettel Cards') => {
  const pdf = new jsPDF();
  const pageHeight = pdf.internal.pageSize.height;
  let currentY = 20;

  // Add title
  pdf.setFontSize(20);
  pdf.text(title, 20, currentY);
  currentY += 20;

  cards.forEach((card, index) => {
    // Check if we need a new page
    if (currentY > pageHeight - 60) {
      pdf.addPage();
      currentY = 20;
    }

    // Card header
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.text(`${card.number}: ${card.title}`, 20, currentY);
    currentY += 10;

    // Category and tags
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    pdf.text(`Category: ${card.category}`, 20, currentY);
    currentY += 7;
    
    if (card.tags.length > 0) {
      pdf.text(`Tags: ${card.tags.join(', ')}`, 20, currentY);
      currentY += 7;
    }

    // Description
    if (card.description) {
      pdf.setFontSize(11);
      const descLines = pdf.splitTextToSize(card.description, 170);
      pdf.text(descLines, 20, currentY);
      currentY += descLines.length * 5;
    }

    // Content
    pdf.setFontSize(10);
    const contentLines = pdf.splitTextToSize(card.content, 170);
    pdf.text(contentLines, 20, currentY);
    currentY += contentLines.length * 4 + 15;

    // Add separator line
    if (index < cards.length - 1) {
      pdf.line(20, currentY - 5, 190, currentY - 5);
      currentY += 5;
    }
  });

  pdf.save(`${title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
};

export const printCards = (cards: ZettelCard[]) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Zettel Cards</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .card { margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .card-header { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
        .card-meta { font-size: 14px; color: #666; margin-bottom: 15px; }
        .card-content { line-height: 1.6; }
        .tags { margin-top: 10px; }
        .tag { display: inline-block; background: #f0f0f0; padding: 2px 6px; margin: 2px; border-radius: 4px; font-size: 12px; }
        @media print { .card { page-break-inside: avoid; } }
      </style>
    </head>
    <body>
      <h1>Zettel Cards</h1>
      ${cards.map(card => `
        <div class="card">
          <div class="card-header">${card.number}: ${card.title}</div>
          <div class="card-meta">
            Category: ${card.category} | Created: ${card.created.toLocaleDateString()}
          </div>
          ${card.description ? `<div class="card-description"><strong>Description:</strong> ${card.description}</div>` : ''}
          <div class="card-content">${card.content}</div>
          ${card.tags.length > 0 ? `
            <div class="tags">
              ${card.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
          ` : ''}
        </div>
      `).join('')}
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.print();
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