"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Move, Pen, Type, Calendar, CheckSquare, Mail, MapPin, User } from "lucide-react";
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
  { bg: "bg-blue-500/20", border: "border-blue-500", text: "text-blue-700" },
  { bg: "bg-green-500/20", border: "border-green-500", text: "text-green-700" },
  { bg: "bg-purple-500/20", border: "border-purple-500", text: "text-purple-700" },
  { bg: "bg-orange-500/20", border: "border-orange-500", text: "text-orange-700" },
  { bg: "bg-pink-500/20", border: "border-pink-500", text: "text-pink-700" },
  { bg: "bg-cyan-500/20", border: "border-cyan-500", text: "text-cyan-700" },
];

export function DraggableField({
  field,
  recipientName,
  recipientColor = "0",
  isSelected,
  onSelect,
  onPositionChange,
  onResize,
  onDelete,
  containerRef,
  scale = 1,
}: DraggableFieldProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const fieldRef = useRef<HTMLDivElement>(null);

  const colorIndex = parseInt(recipientColor) % recipientColors.length;
  const colors = recipientColors[colorIndex];

  const Icon = fieldIcons[field.type] || Type;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      setDragStart({
        x: e.clientX - field.xPosition * scale,
        y: e.clientY - field.yPosition * scale,
      });
      onSelect?.();
    },
    [field.xPosition, field.yPosition, scale, onSelect]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const newX = (e.clientX - dragStart.x) / scale;
      const newY = (e.clientY - dragStart.y) / scale;

      // Ensure field stays within bounds (basic constraint)
      const boundedX = Math.max(0, newX);
      const boundedY = Math.max(0, newY);

      onPositionChange(field.id, boundedX, boundedY);
    },
    [isDragging, dragStart, scale, field.id, onPositionChange]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={fieldRef}
      className={cn(
        "absolute border-2 rounded cursor-move flex items-center justify-center group transition-shadow",
        colors.bg,
        colors.border,
        isSelected && "ring-2 ring-offset-2 ring-primary shadow-lg",
        isDragging && "opacity-80 shadow-xl z-50"
      )}
      style={{
        left: field.xPosition,
        top: field.yPosition,
        width: field.width,
        height: field.height,
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
    >
      {/* Field content */}
      <div className={cn("flex flex-col items-center gap-0.5 text-xs", colors.text)}>
        <Icon className="h-4 w-4" />
        <span className="font-medium capitalize">{fieldLabels[field.type] || field.type}</span>
        {recipientName && (
          <span className="text-[10px] opacity-70 truncate max-w-full px-1">
            {recipientName}
          </span>
        )}
      </div>

      {/* Delete button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -top-3 -right-3 h-6 w-6 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-destructive/90"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(field.id);
        }}
      >
        <Trash2 className="h-3 w-3" />
      </Button>

      {/* Drag handle indicator */}
      <div className="absolute -top-3 -left-3 h-6 w-6 rounded-full bg-muted border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <Move className="h-3 w-3 text-muted-foreground" />
      </div>
    </div>
  );
}
