"use client";

import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfDocumentProps {
  fileUrl: string;
  currentPage: number;
  scale: number;
  onLoadSuccess: (data: { numPages: number }) => void;
  onPageLoadSuccess: (page: { width: number; height: number }) => void;
}

export function PdfDocument({
  fileUrl,
  currentPage,
  scale,
  onLoadSuccess,
  onPageLoadSuccess,
}: PdfDocumentProps) {
  return (
    <Document
      file={fileUrl}
      onLoadSuccess={onLoadSuccess}
      loading={null}
    >
      <Page
        pageNumber={currentPage}
        scale={scale}
        onLoadSuccess={onPageLoadSuccess}
        renderTextLayer={true}
        renderAnnotationLayer={true}
      />
    </Document>
  );
}
