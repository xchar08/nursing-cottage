// src/utils/fileParser.ts
import * as pdfjsLib from 'pdfjs-dist';

// Initialize the worker
if (typeof window !== 'undefined') {
  // We use a specific version (3.11.174) from CDN to match our installed package
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

/**
 * Extracts text from a PDF file
 */
export const parsePdf = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  
  // Load the document
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  let fullText = "";
  
  // Iterate through pages
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    // Extract strings from text items
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(" ");
      
    fullText += `\n--- Page ${i} ---\n${pageText}\n`;
  }
  
  return fullText;
};

/**
 * Extracts text from a PowerPoint (.pptx) file
 */
export const parsePptx = async (file: File): Promise<string> => {
  // Dynamically import JSZip to avoid server-side issues
  const JSZip = (await import("jszip")).default;
  
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  
  const slideTexts: string[] = [];
  
  // Find slide XML files
  const slideFiles = Object.keys(zip.files)
    .filter(name => name.startsWith("ppt/slides/slide") && name.endsWith(".xml"))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || "0");
      const numB = parseInt(b.match(/\d+/)?.[0] || "0");
      return numA - numB;
    });

  for (const fileName of slideFiles) {
    const slideXml = await zip.files[fileName].async("string");
    
    // Regex to capture text inside <a:t> tags
    const textMatches = slideXml.match(/<a:t>([^<]*)<\/a:t>/g);
    
    if (textMatches) {
      const slideText = textMatches
        .map(match => match.replace(/<\/?a:t>/g, ""))
        .join(" ");
      
      const slideNumber = fileName.match(/\d+/)?.[0] || "?";
      slideTexts.push(`--- Slide ${slideNumber} ---\n${slideText.trim()}`);
    }
  }

  return slideTexts.join("\n\n");
};
