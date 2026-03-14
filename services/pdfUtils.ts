// Declare global variable for the PDF.js library loaded via CDN
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

export const extractTextFromPdf = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    // Using the global pdfjsLib loaded in index.html
    const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    // Limit to first 10 pages to avoid massive processing on client side for this demo
    const maxPages = Math.min(pdf.numPages, 10);
    
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += `--- Page ${i} ---\n${pageText}\n\n`;
    }

    if (pdf.numPages > 10) {
      fullText += `\n... (Truncated after 10 pages)`;
    }
    
    return fullText;
  } catch (error) {
    console.error("Error extracting PDF text:", error);
    throw new Error("Failed to extract text from PDF. Please try a simpler file.");
  }
};
