"use client";

import React, { useRef, useEffect, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Quote,
  Link,
  HelpCircle,
  Undo,
  Redo,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your content here...",
  readOnly = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Sync value to editor innerHTML ONLY if it differs to prevent cursor jumping
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const triggerChange = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const executeCommand = (command: string, arg: string = "") => {
    if (readOnly) return;
    document.execCommand(command, false, arg);
    triggerChange();
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handleLink = () => {
    if (readOnly) return;
    const selection = window.getSelection();
    let defaultUrl = "";
    if (selection && selection.toString()) {
      defaultUrl = selection.toString().startsWith("http") ? selection.toString() : "";
    }
    const url = prompt("Enter hyperlink URL:", defaultUrl || "https://");
    if (url) {
      executeCommand("createLink", url);
    }
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (readOnly) return;
    executeCommand("foreColor", e.target.value);
    e.target.value = ""; // Reset dropdown selection
  };

  const handleHeadingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (readOnly) return;
    executeCommand("formatBlock", e.target.value);
    e.target.value = ""; // Reset dropdown selection
  };

  const toggleRtl = () => {
    if (readOnly) return;
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      let parent = selection.anchorNode as HTMLElement | null;
      while (parent && parent !== editorRef.current) {
        if (
          parent.nodeName === "P" ||
          parent.nodeName.startsWith("H") ||
          parent.nodeName === "BLOCKQUOTE" ||
          parent.nodeName === "LI" ||
          parent.nodeName === "DIV"
        ) {
          const currentDir = parent.getAttribute("dir");
          if (currentDir === "rtl") {
            parent.removeAttribute("dir");
          } else {
            parent.setAttribute("dir", "rtl");
          }
          triggerChange();
          return;
        }
        parent = parent.parentElement;
      }
      
      // Toggle top-level element if no block parent is found
      if (editorRef.current) {
        const currentDir = editorRef.current.getAttribute("dir");
        if (currentDir === "rtl") {
          editorRef.current.removeAttribute("dir");
        } else {
          editorRef.current.setAttribute("dir", "rtl");
        }
        triggerChange();
      }
    }
  };

  return (
    <div className="w-full rounded-lg border border-border bg-surface text-foreground shadow-sm">
      {/* Rich Text Toolbar */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-surface-muted p-2 select-none">
          <button
            type="button"
            onClick={() => executeCommand("bold")}
            className="rounded p-1.5 text-muted hover:bg-surface-muted-hover hover:text-foreground transition-colors"
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand("italic")}
            className="rounded p-1.5 text-muted hover:bg-surface-muted-hover hover:text-foreground transition-colors"
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand("underline")}
            className="rounded p-1.5 text-muted hover:bg-surface-muted-hover hover:text-foreground transition-colors"
            title="Underline"
          >
            <Underline className="h-4 w-4" />
          </button>

          <span className="h-4 w-px bg-border my-1" />

          {/* Heading Dropdown */}
          <select
            onChange={handleHeadingChange}
            defaultValue=""
            className="rounded border border-border bg-surface px-2 py-1 text-xs text-muted hover:text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            title="Headings"
          >
            <option value="" disabled hidden>Style</option>
            <option value="<p>">Paragraph</option>
            <option value="<h1>">Heading 1</option>
            <option value="<h2>">Heading 2</option>
            <option value="<h3>">Heading 3</option>
          </select>

          {/* Color Dropdown */}
          <select
            onChange={handleColorChange}
            defaultValue=""
            className="rounded border border-border bg-surface px-2 py-1 text-xs text-muted hover:text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            title="Text Color"
          >
            <option value="" disabled hidden>Color</option>
            <option value="#1a1a1a">Default</option>
            <option value="#dc2626">Red</option>
            <option value="#2563eb">Blue</option>
            <option value="#16a34a">Green</option>
          </select>

          <span className="h-4 w-px bg-border my-1" />

          {/* Lists */}
          <button
            type="button"
            onClick={() => executeCommand("insertUnorderedList")}
            className="rounded p-1.5 text-muted hover:bg-surface-muted-hover hover:text-foreground transition-colors"
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand("insertOrderedList")}
            className="rounded p-1.5 text-muted hover:bg-surface-muted-hover hover:text-foreground transition-colors"
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand("formatBlock", "blockquote")}
            className="rounded p-1.5 text-muted hover:bg-surface-muted-hover hover:text-foreground transition-colors"
            title="Quote"
          >
            <Quote className="h-4 w-4" />
          </button>

          <span className="h-4 w-px bg-border my-1" />

          {/* Alignment */}
          <button
            type="button"
            onClick={() => executeCommand("justifyLeft")}
            className="rounded p-1.5 text-muted hover:bg-surface-muted-hover hover:text-foreground transition-colors"
            title="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand("justifyCenter")}
            className="rounded p-1.5 text-muted hover:bg-surface-muted-hover hover:text-foreground transition-colors"
            title="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand("justifyRight")}
            className="rounded p-1.5 text-muted hover:bg-surface-muted-hover hover:text-foreground transition-colors"
            title="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </button>

          <span className="h-4 w-px bg-border my-1" />

          {/* RTL Toggle */}
          <button
            type="button"
            onClick={toggleRtl}
            className="rounded px-2 py-1 text-xs font-semibold text-muted hover:bg-surface-muted-hover hover:text-foreground border border-border/80 transition-colors"
            title="Toggle Right-To-Left (RTL)"
          >
            RTL
          </button>

          {/* Link */}
          <button
            type="button"
            onClick={handleLink}
            className="rounded p-1.5 text-muted hover:bg-surface-muted-hover hover:text-foreground transition-colors"
            title="Hyperlink"
          >
            <Link className="h-4 w-4" />
          </button>

          <span className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => executeCommand("undo")}
              className="rounded p-1.5 text-muted hover:bg-surface-muted-hover hover:text-foreground transition-colors"
              title="Undo"
            >
              <Undo className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand("redo")}
              className="rounded p-1.5 text-muted hover:bg-surface-muted-hover hover:text-foreground transition-colors"
              title="Redo"
            >
              <Redo className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsGuideOpen(!isGuideOpen)}
              className={`rounded p-1.5 hover:bg-surface-muted-hover transition-colors ${isGuideOpen ? "text-primary" : "text-muted"}`}
              title="Formatting Instructions"
            >
              <HelpCircle className="h-4.5 w-4.5" />
            </button>
          </span>
        </div>
      )}

      {/* Editable Area */}
      <div
        ref={editorRef}
        contentEditable={!readOnly}
        onInput={triggerChange}
        onBlur={triggerChange}
        className={`min-h-[350px] w-full px-4 py-3 outline-none text-base leading-relaxed overflow-y-auto ${
          readOnly ? "bg-background/60 cursor-default" : "bg-surface"
        }`}
        data-placeholder={placeholder}
        style={{
          direction: "inherit",
          unicodeBidi: "embed",
        }}
      />

      {/* Instructions / Help Panel */}
      {isGuideOpen && !readOnly && (
        <div className="border-t border-border bg-surface-muted p-4 text-xs text-muted leading-relaxed">
          <p className="font-semibold text-foreground mb-1">Editor Formatting Guide:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Bold / Italic / Underline / Color:</strong> Highlight the target text first, then select option.</li>
            <li><strong>Headers & Lists:</strong> Place your cursor inside the line or highlight paragraphs, then select H1-H3 or List styles.</li>
            <li><strong>RTL Text (Arabic/Urdu):</strong> Click the line, then click the <span className="font-semibold text-foreground">RTL</span> button.</li>
            <li><strong>Links:</strong> Select text, click link icon, and paste URL.</li>
          </ul>
        </div>
      )}
    </div>
  );
}
