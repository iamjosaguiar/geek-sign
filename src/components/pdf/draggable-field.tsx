"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Pen, Type, Calendar, CheckSquare, Mail, MapPin, User, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FieldData {
  id: string;
  type: string;
  page: number;
  xPosition: number;
  yPosition: number;
  width: number;
  height: number;
  recipientId: string;
  required: boolean;
  value?: string | null;
}

interface DraggableFieldProps {
  field: FieldData;
  recipientName?: string;
  recipientColor?: string;
  isSelected?: boolean;
  onSelect?: () => void;
  onPositionChange: (id: string, x: number, y: number) => void;
  onResize?: (id: string, width: number, height: number) => void;
  onDelete: (id: string) => void;
  containerRef?: React.RefObject<HTMLDivElement>;
  scale?: number;
}

const fieldIcons: Record<string, typeof Pen> = {
  signature: Pen,
  initials: Type,
  date: Calendar,
  text: Type,
  checkbox: CheckSquare,
  name: User,
  email: Mail,
  address: MapPin,
  title: User,
};

const fieldLabels: Record<string, string> = {
  signature: "Signature",
  initials: "Initials",
  date: "Date",
  text: "Text",
  checkbox: "Checkbox",
  name: "Name",
  email: "Email",
  address: "Address",
  title: "Title",
};

// Color palette for recipients
export const recipientColors = [
  { bg: "bg-blue-500/20", border: "border-blue-500", text: "text-blue-700", solid: "bg-blue-500" },
  { bg: "bg-green-500/20", border: "border-green-500", text: "text-green-700", solid: "bg-green-500" },
  { bg: "bg-purple-500/20", border: "border-purple-500", text: "text-purple-700", solid: "bg-purple-500" },
  { bg: "bg-orange-500/20", border: "border-orange-500", text: "text-orange-700", solid: "bg-orange-500" },
  { bg: "bg-pink-500/20", border: "border-pink-500", text: "text-pink-700", solid: "bg-pink-500" },
  { bg: "bg-cyan-500/20", border: "border-cyan-500", text: "text-cyan-700", solid: "bg-cyan-500" },
];

type DragMode = "none" | "move" | "resize-se" | "resize-e" | "resize-s";

export function DraggableField({
  field,
  recipientName,
  recipientColor = "0",
  isSelected,
  onSelect,
  onPositionChange,
  onResize,
  onDelete,
  scale = 1,
}: DraggableFieldProps) {
  const [dragMode, setDragMode] = useState<DragMode>("none");
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });
  const [initialPos, setInitialPos] = useState({ x: 0, y: 0 });
  const fieldRef = useRef<HTMLDivElement>(null);

  const colorIndex = parseInt(recipientColor) % recipientColors.length;
  const colors = recipientColors[colorIndex >= 0 ? colorIndex : 0];

  const Icon = fieldIcons[field.type] || Type;

  // Start dragging (move)
  const handleMoveStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      setDragMode("move");
      setDragStart({ x: clientX, y: clientY });
      setInitialPos({ x: field.xPosition, y: field.yPosition });
      onSelect?.();
    },
    [field.xPosition, field.yPosition, onSelect]
  );

  // Start resizing
  const handleResizeStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent, mode: DragMode) => {
      e.preventDefault();
      e.stopPropagation();

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      setDragMode(mode);
      setDragStart({ x: clientX, y: clientY });
      setInitialSize({ width: field.width, height: field.height });
      onSelect?.();
    },
    [field.width, field.height, onSelect]
  );

  // Handle mouse/touch move
  const handleMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (dragMode === "none") return;

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      const deltaX = (clientX - dragStart.x) / scale;
      const deltaY = (clientY - dragStart.y) / scale;

      if (dragMode === "move") {
        const newX = Math.max(0, initialPos.x + deltaX);
        const newY = Math.max(0, initialPos.y + deltaY);
        onPositionChange(field.id, newX, newY);
      } else if (onResize) {
        let newWidth = initialSize.width;
        let newHeight = initialSize.height;

        if (dragMode === "resize-se" || dragMode === "resize-e") {
          newWidth = Math.max(50, initialSize.width + deltaX);
        }
        if (dragMode === "resize-se" || dragMode === "resize-s") {
          newHeight = Math.max(24, initialSize.height + deltaY);
        }

        onResize(field.id, newWidth, newHeight);
      }
    },
    [dragMode, dragStart, scale, initialPos, initialSize, field.id, onPositionChange, onResize]
  );

  // Handle mouse/touch up
  const handleEnd = useCallback(() => {
    setDragMode("none");
  }, []);

  // Add/remove event listeners
  useEffect(() => {
    if (dragMode !== "none") {
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleEnd);
      window.addEventListener("touchmove", handleMove);
      window.addEventListener("touchend", handleEnd);

      // Prevent text selection while dragging
      document.body.style.userSelect = "none";

      return () => {
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleEnd);
        window.removeEventListener("touchmove", handleMove);
        window.removeEventListener("touchend", handleEnd);
        document.body.style.userSelect = "";
      };
    }
  }, [dragMode, handleMove, handleEnd]);

  const isDragging = dragMode !== "none";

  return (
    <div
      ref={fieldRef}
      data-field-id={field.id}
      className={cn(
        "absolute border-2 rounded select-none",
        colors.bg,
        colors.border,
        isSelected && "ring-2 ring-offset-1 ring-primary",
        isDragging && "opacity-90 z-50"
      )}
      style={{
        left: field.xPosition,
        top: field.yPosition,
        width: field.width,
        height: field.height,
        touchAction: "none",
      }}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onSelect?.();
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
    >
      {/* Main drag area - the entire field */}
      <div
        className="absolute inset-0 cursor-move flex items-center justify-center"
        onMouseDown={handleMoveStart}
        onTouchStart={handleMoveStart}
      >
        {/* Field content */}
        <div className={cn("flex flex-col items-center gap-0.5 text-xs pointer-events-none", colors.text)}>
          <Icon className="h-4 w-4" />
          <span className="font-medium capitalize text-center leading-tight">
            {fieldLabels[field.type] || field.type}
          </span>
          {recipientName && field.height > 50 && (
            <span className="text-[10px] opacity-70 truncate max-w-full px-1">
              {recipientName}
            </span>
          )}
        </div>
      </div>

      {/* Drag handle in top-left corner */}
      <div
        className={cn(
          "absolute -top-3 -left-3 h-7 w-7 rounded-md flex items-center justify-center cursor-move shadow-md border-2 border-white",
          colors.solid
        )}
        onMouseDown={handleMoveStart}
        onTouchStart={handleMoveStart}
      >
        <GripVertical className="h-4 w-4 text-white" />
      </div>

      {/* Delete button in top-right corner */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -top-3 -right-3 h-7 w-7 rounded-md bg-red-500 text-white hover:bg-red-600 shadow-md border-2 border-white"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(field.id);
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      {/* Resize handles - only show when selected and onResize is provided */}
      {isSelected && onResize && (
        <>
          {/* Right edge resize */}
          <div
            className="absolute top-1/2 -right-2 w-4 h-8 -translate-y-1/2 cursor-ew-resize bg-white border-2 border-gray-400 rounded-sm hover:border-primary hover:bg-primary/10"
            onMouseDown={(e) => handleResizeStart(e, "resize-e")}
            onTouchStart={(e) => handleResizeStart(e, "resize-e")}
          />

          {/* Bottom edge resize */}
          <div
            className="absolute -bottom-2 left-1/2 h-4 w-8 -translate-x-1/2 cursor-ns-resize bg-white border-2 border-gray-400 rounded-sm hover:border-primary hover:bg-primary/10"
            onMouseDown={(e) => handleResizeStart(e, "resize-s")}
            onTouchStart={(e) => handleResizeStart(e, "resize-s")}
          />

          {/* Bottom-right corner resize */}
          <div
            className="absolute -bottom-2 -right-2 h-5 w-5 cursor-nwse-resize bg-white border-2 border-gray-400 rounded-sm hover:border-primary hover:bg-primary/10"
            onMouseDown={(e) => handleResizeStart(e, "resize-se")}
            onTouchStart={(e) => handleResizeStart(e, "resize-se")}
          />
        </>
      )}
    </div>
  );
}
