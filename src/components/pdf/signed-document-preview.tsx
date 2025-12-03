"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, FileText } from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DocumentField {
  id: string;
  type: string;
  page: number;
  xPosition: number;
  yPosition: number;
  width: number;
  height: number;
  value: string | null;
  recipientId: string;
}

interface SignedDocumentPreviewProps {
  fileUrl: string | null;
  fields: DocumentField[];
}

export function SignedDocumentPreview({ fileUrl, fields }: SignedDocumentPreviewProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState({ width: 612, height: 792 });

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const onDocumentLoadError = () => {
    setError("Failed to load PDF");
    setLoading(false);
  };

  const onPageLoadSuccess = (page: { width: number; height: number }) => {
    setPageSize({ width: page.width, height: page.height });
  };

  // Filter fields for current page
  const currentPageFields = fields.filter((f) => f.page === currentPage && f.value);

  const renderFieldValue = (field: DocumentField) => {
    const value = field.value || "";

    switch (field.type) {
      case "signature":
      case "initials":
        if (value.startsWith("data:image")) {
          return (
            <img
              src={value}
              alt={field.type === "signature" ? "Signature" : "Initials"}
              className="w-full h-full object-contain"
              style={{ maxWidth: "100%", maxHeight: "100%" }}
            />
          );
        }
        // Text-based signature
        return (
          <span
            className="text-blue-800 font-medium"
            style={{
              fontSize: field.type === "signature" ? "16px" : "14px",
              fontFamily: "cursive, serif",
            }}
          >
            {value}
          </span>
        );

      case "checkbox":
        if (value === "true" || value === "checked") {
          return (
            <span className="text-black font-bold text-lg">X</span>
          );
        }
        return null;

      case "date":
      case "text":
      case "name":
      case "email":
      case "title":
      case "company":
      case "address":
        return (
          <span className="text-black text-sm">
            {value}
          </span>
        );

      default:
        return (
          <span className="text-black text-sm">
            {value}
          </span>
        );
    }
  };

  if (!fileUrl) {
    return (
      <div className="aspect-[8.5/11] rounded-lg border bg-muted flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <FileText className="h-16 w-16 mx-auto mb-4" />
          <p>No PDF uploaded</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="aspect-[8.5/11] rounded-lg border bg-muted flex items-center justify-center">
        <div className="text-center text-destructive">
          <FileText className="h-16 w-16 mx-auto mb-4" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm min-w-[100px] text-center">
            Page {currentPage} of {numPages || "..."}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            disabled={currentPage >= numPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
            disabled={scale <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm w-16 text-center">{Math.round(scale * 100)}%</span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setScale((s) => Math.min(2, s + 0.25))}
            disabled={scale >= 2}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Display with Signature Overlays */}
      <div className="overflow-auto rounded-lg border bg-gray-100 p-4">
        <div className="flex justify-center">
          <div className="relative shadow-lg bg-white">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={null}
            >
              <Page
                pageNumber={currentPage}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                onLoadSuccess={onPageLoadSuccess}
              />
            </Document>

            {/* Signature Overlays */}
            {!loading && (
              <div
                className="absolute top-0 left-0 pointer-events-none"
                style={{
                  width: pageSize.width * scale,
                  height: pageSize.height * scale,
                }}
              >
                {currentPageFields.map((field) => (
                  <div
                    key={field.id}
                    className="absolute flex items-center justify-center overflow-hidden"
                    style={{
                      left: field.xPosition * scale,
                      top: field.yPosition * scale,
                      width: field.width * scale,
                      height: field.height * scale,
                    }}
                  >
                    {renderFieldValue(field)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
