// Copyright (c) 2026 Cloudflare, Inc.
// SPDX-License-Identifier: Apache-2.0
// Modified by Aaron Ruan.

import { m } from "shared/paraglide/messages.js";

import { Button, Dialog, Input, Tooltip } from "@cloudflare/kumo";
import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  LinkBreakIcon,
  LinkSimpleIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  MinusIcon,
  QuotesIcon,
  TextBIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  TextUnderlineIcon,
} from "@phosphor-icons/react";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TiptapImage from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useEffect, useState } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function RichTextEditor({ value, onChange, disabled = false }: RichTextEditorProps) {
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      LinkExtension.configure({ openOnClick: false }),
      TiptapImage,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
    ],
    content: value,
    immediatelyRender: false,
    editable: !disabled,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": m.message(),
        "aria-multiline": "true",
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[180px] p-3 text-sm [&_blockquote]:border-l-2 [&_blockquote]:border-kumo-line [&_blockquote]:pl-3 [&_blockquote]:text-kumo-subtle [&_blockquote]:bg-kumo-tint [&_blockquote]:py-1 [&_blockquote]:my-2 [&_blockquote]:text-xs [&_blockquote]:rounded-r-sm",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && !editor.isDestroyed && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  useEffect(() => {
    editor?.setEditable(!disabled, false);
  }, [editor, disabled]);

  const setLink = useCallback(() => {
    if (!editor) return;
    setLinkUrl(editor.getAttributes("link").href || "");
    setIsLinkOpen(true);
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="border-kumo-line flex h-full flex-col overflow-hidden rounded-lg border">
      <Dialog.Root open={isLinkOpen} onOpenChange={setIsLinkOpen}>
        <Dialog className="p-6">
          <Dialog.Title className="mb-4 text-base font-semibold">{m.edit_link()}</Dialog.Title>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (disabled || editor.isDestroyed) return;
              if (linkUrl === "") {
                editor.chain().focus().extendMarkRange("link").unsetLink().run();
              } else {
                editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
              }
              setIsLinkOpen(false);
            }}
          >
            <Input
              label={m.url()}
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              disabled={disabled}
            />
            <div className="mt-5 flex justify-end gap-2">
              <Dialog.Close
                render={
                  <Button type="button" variant="secondary">
                    {m.cancel()}
                  </Button>
                }
              />
              <Button type="submit" variant="primary" disabled={disabled}>
                {m.save()}
              </Button>
            </div>
          </form>
        </Dialog>
      </Dialog.Root>
      {/* Toolbar */}
      <div className="bg-kumo-recessed border-kumo-line flex shrink-0 flex-wrap items-center gap-0.5 border-b px-2 py-1.5">
        {/* Text formatting */}
        <Tooltip
          content={m.bold()}
          side="bottom"
          render={
            <Button
              type="button"
              variant={editor.isActive("bold") ? "secondary" : "ghost"}
              shape="square"
              size="sm"
              icon={<TextBIcon size={16} />}
              onClick={() => editor.chain().focus().toggleBold().run()}
              aria-label={m.bold()}
            />
          }
        />
        <Tooltip
          content={m.italic()}
          side="bottom"
          render={
            <Button
              type="button"
              variant={editor.isActive("italic") ? "secondary" : "ghost"}
              shape="square"
              size="sm"
              icon={<TextItalicIcon size={16} />}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              aria-label={m.italic()}
            />
          }
        />
        <Tooltip
          content={m.underline()}
          side="bottom"
          render={
            <Button
              type="button"
              variant={editor.isActive("underline") ? "secondary" : "ghost"}
              shape="square"
              size="sm"
              icon={<TextUnderlineIcon size={16} />}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              aria-label={m.underline()}
            />
          }
        />
        <Tooltip
          content={m.strikethrough()}
          side="bottom"
          render={
            <Button
              type="button"
              variant={editor.isActive("strike") ? "secondary" : "ghost"}
              shape="square"
              size="sm"
              icon={<TextStrikethroughIcon size={16} />}
              onClick={() => editor.chain().focus().toggleStrike().run()}
              aria-label={m.strikethrough()}
            />
          }
        />

        <div className="bg-kumo-fill mx-1 h-5 w-px" />

        {/* Lists */}
        <Tooltip
          content={m.bullet_list()}
          side="bottom"
          render={
            <Button
              type="button"
              variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
              shape="square"
              size="sm"
              icon={<ListBulletsIcon size={16} />}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              aria-label={m.bullet_list()}
            />
          }
        />
        <Tooltip
          content={m.numbered_list()}
          side="bottom"
          render={
            <Button
              type="button"
              variant={editor.isActive("orderedList") ? "secondary" : "ghost"}
              shape="square"
              size="sm"
              icon={<ListNumbersIcon size={16} />}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              aria-label={m.numbered_list()}
            />
          }
        />

        <div className="bg-kumo-fill mx-1 h-5 w-px" />

        {/* Block formatting */}
        <Tooltip
          content={m.blockquote()}
          side="bottom"
          render={
            <Button
              type="button"
              variant={editor.isActive("blockquote") ? "secondary" : "ghost"}
              shape="square"
              size="sm"
              icon={<QuotesIcon size={16} />}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              aria-label={m.blockquote()}
            />
          }
        />
        <Tooltip
          content={m.link()}
          side="bottom"
          render={
            <Button
              type="button"
              variant={editor.isActive("link") ? "secondary" : "ghost"}
              shape="square"
              size="sm"
              icon={<LinkSimpleIcon size={16} />}
              onClick={setLink}
              aria-label={m.link()}
            />
          }
        />
        {editor.isActive("link") && (
          <Tooltip
            content={m.remove_link()}
            side="bottom"
            render={
              <Button
                type="button"
                variant="ghost"
                shape="square"
                size="sm"
                icon={<LinkBreakIcon size={16} />}
                onClick={() => editor.chain().focus().unsetLink().run()}
                aria-label={m.remove_link()}
              />
            }
          />
        )}
        <Tooltip
          content={m.horizontal_rule()}
          side="bottom"
          render={
            <Button
              type="button"
              variant="ghost"
              shape="square"
              size="sm"
              icon={<MinusIcon size={16} />}
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              aria-label={m.horizontal_rule()}
            />
          }
        />

        <div className="bg-kumo-fill mx-1 h-5 w-px" />

        {/* Undo/Redo */}
        <Tooltip
          content={m.undo()}
          side="bottom"
          render={
            <Button
              type="button"
              variant="ghost"
              shape="square"
              size="sm"
              icon={<ArrowCounterClockwiseIcon size={16} />}
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              aria-label={m.undo()}
            />
          }
        />
        <Tooltip
          content={m.redo()}
          side="bottom"
          render={
            <Button
              type="button"
              variant="ghost"
              shape="square"
              size="sm"
              icon={<ArrowClockwiseIcon size={16} />}
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              aria-label={m.redo()}
            />
          }
        />
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
