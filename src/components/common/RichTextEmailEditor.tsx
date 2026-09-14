"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Heading2,
  Heading3,
  Link as LinkIcon,
  Image as ImageIcon,
  RotateCcw,
  Eraser,
  Minus,
  Check,
  Upload,
} from "lucide-react";

interface RichTextEmailEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  maxHeight?: string;
  onImagePasted?: (imageCount: number) => void;
}

export function RichTextEmailEditor({
  value,
  onChange,
  placeholder = "Write your flight email message here... You can paste screenshots or images directly!",
  minHeight = "180px",
  maxHeight = "360px",
  onImagePasted,
}: RichTextEmailEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInternalUpdate = useRef(false);
  const [imageCount, setImageCount] = useState(0);

  // Sync incoming value to innerHTML when not focused or changed from template
  useEffect(() => {
    if (editorRef.current && !isInternalUpdate.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || "";
        countImages();
      }
    }
    isInternalUpdate.current = false;
  }, [value]);

  const countImages = useCallback(() => {
    if (!editorRef.current) return;
    const imgs = editorRef.current.querySelectorAll("img");
    setImageCount(imgs.length);
    if (onImagePasted) {
      onImagePasted(imgs.length);
    }
  }, [onImagePasted]);

  const handleInput = () => {
    if (editorRef.current) {
      isInternalUpdate.current = true;
      const html = editorRef.current.innerHTML;
      onChange(html);
      countImages();
    }
  };

  const executeCommand = (command: string, arg?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, arg);
    handleInput();
  };

  // Direct clipboard paste handling for images
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    let hasImage = false;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf("image") !== -1) {
        e.preventDefault();
        hasImage = true;
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64Data = event.target?.result as string;
            insertImageHtml(base64Data, file.name || "Pasted image");
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  // Drag & drop handling for images
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith("image/")) {
        e.preventDefault();
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64Data = event.target?.result as string;
          insertImageHtml(base64Data, file.name || "Dropped image");
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const insertImageHtml = (src: string, alt: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const imgHtml = `<img src="${src}" alt="${alt}" style="max-width: 100%; max-height: 280px; object-fit: contain; border-radius: 8px; border: 1px solid #cbd5e1; margin: 8px 0; display: block; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.08);" />`;
    document.execCommand("insertHTML", false, imgHtml);
    handleInput();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Data = event.target?.result as string;
        insertImageHtml(base64Data, file.name || "Uploaded image");
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const handleInsertLink = () => {
    const url = prompt("Enter URL link (e.g. https://travelocase.com):");
    if (url) {
      executeCommand("createLink", url);
    }
  };

  return (
    <div className="rounded-xl border border-slate-300 bg-white overflow-hidden shadow-xs flex flex-col transition-all focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/50">
      {/* Hidden File Input for Image Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        multiple
        className="hidden"
      />

      {/* Editor Formatting Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-1.5 bg-slate-50 border-b border-slate-200 text-slate-700">
        {/* Text Styles */}
        <button
          type="button"
          onClick={() => executeCommand("bold")}
          title="Bold (Ctrl+B)"
          className="p-1.5 rounded hover:bg-slate-200 hover:text-slate-900 transition active:bg-indigo-600"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand("italic")}
          title="Italic (Ctrl+I)"
          className="p-1.5 rounded hover:bg-slate-200 hover:text-slate-900 transition active:bg-indigo-600"
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand("underline")}
          title="Underline (Ctrl+U)"
          className="p-1.5 rounded hover:bg-slate-200 hover:text-slate-900 transition active:bg-indigo-600"
        >
          <Underline className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand("strikeThrough")}
          title="Strikethrough"
          className="p-1.5 rounded hover:bg-slate-200 hover:text-slate-900 transition active:bg-indigo-600"
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </button>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        {/* Headings */}
        <button
          type="button"
          onClick={() => executeCommand("formatBlock", "<h2>")}
          title="Heading 2"
          className="p-1.5 rounded hover:bg-slate-200 hover:text-slate-900 transition active:bg-indigo-600 flex items-center gap-0.5 text-[11px] font-bold"
        >
          <Heading2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand("formatBlock", "<h3>")}
          title="Heading 3"
          className="p-1.5 rounded hover:bg-slate-200 hover:text-slate-900 transition active:bg-indigo-600 flex items-center gap-0.5 text-[11px] font-bold"
        >
          <Heading3 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand("formatBlock", "<p>")}
          title="Normal Paragraph"
          className="px-1.5 py-1 rounded hover:bg-slate-200 hover:text-slate-900 transition text-[11px] font-mono"
        >
          P
        </button>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        {/* Lists & Quotes */}
        <button
          type="button"
          onClick={() => executeCommand("insertUnorderedList")}
          title="Bullet List"
          className="p-1.5 rounded hover:bg-slate-200 hover:text-slate-900 transition active:bg-indigo-600"
        >
          <List className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand("insertOrderedList")}
          title="Numbered List"
          className="p-1.5 rounded hover:bg-slate-200 hover:text-slate-900 transition active:bg-indigo-600"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand("formatBlock", "<blockquote>")}
          title="Blockquote"
          className="p-1.5 rounded hover:bg-slate-200 hover:text-slate-900 transition active:bg-indigo-600"
        >
          <Quote className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand("insertHorizontalRule")}
          title="Divider Line"
          className="p-1.5 rounded hover:bg-slate-200 hover:text-slate-900 transition active:bg-indigo-600"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        {/* Link & Image Insertion */}
        <button
          type="button"
          onClick={handleInsertLink}
          title="Insert Link"
          className="p-1.5 rounded hover:bg-slate-200 hover:text-slate-900 transition active:bg-indigo-600"
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Insert / Upload Image (or Paste directly with Ctrl+V)"
          className="flex items-center gap-1 px-2 py-1 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-900 transition text-xs font-semibold"
        >
          <ImageIcon className="h-3.5 w-3.5" />
          <span className="text-[10px] hidden sm:inline">Insert / Paste Image</span>
        </button>

        {/* Clear formatting */}
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => executeCommand("removeFormat")}
            title="Clear Formatting"
            className="p-1.5 rounded text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition"
          >
            <Eraser className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Editable HTML Content Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        onDrop={handleDrop}
        style={{ minHeight, maxHeight }}
        className="p-3.5 overflow-y-auto text-xs text-slate-900 font-sans leading-relaxed outline-none focus:outline-none focus:ring-0 empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none prose max-w-none prose-sm"
        data-placeholder={placeholder}
      />

      {/* Editor Status Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-slate-50 border-t border-slate-200 text-[10px] font-mono text-slate-500">
        <div className="flex items-center gap-2">
          <span>Tip: Press <strong>Ctrl+V</strong> to paste screenshots directly</span>
          {imageCount > 0 && (
            <span className="text-cyan-800 flex items-center gap-1 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-200 font-semibold">
              <ImageIcon className="h-3 w-3" />
              {imageCount} {imageCount === 1 ? "Image" : "Images"} attached
            </span>
          )}
        </div>
        <div className="text-slate-400">HTML Rich-Text Mode</div>
      </div>
    </div>
  );
}
