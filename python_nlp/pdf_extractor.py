#!/usr/bin/env python3
"""
ModelMind PDF Text Extractor using PyMuPDF (fitz)
Extracts clean plain text from uploaded PDF lecture slides, textbooks, and notes.
"""

import sys
import json
import os

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None


def extract_pdf_text(pdf_path: str) -> dict:
    if not os.path.exists(pdf_path):
        return {"success": False, "error": f"File not found: {pdf_path}"}

    if fitz is None:
        return {"success": False, "error": "PyMuPDF (fitz) is not installed."}

    try:
        doc = fitz.open(pdf_path)
        page_count = len(doc)
        full_text = []

        for page_num in range(page_count):
            page = doc.load_page(page_num)
            text = page.get_text("text")
            if text:
                full_text.append(text)

        joined_text = "\n\n".join(full_text).strip()

        # Clean common PDF hyphenation and excessive spaces
        cleaned_text = joined_text.replace("-\n", "").replace("\r\n", "\n")

        metadata = {
            "title": doc.metadata.get("title", ""),
            "author": doc.metadata.get("author", ""),
            "pageCount": page_count,
            "charCount": len(cleaned_text),
            "wordCount": len(cleaned_text.split())
        }

        doc.close()
        return {
            "success": True,
            "text": cleaned_text,
            "metadata": metadata
        }
    except Exception as e:
        return {"success": False, "error": f"PyMuPDF error: {str(e)}"}


if __name__ == "__main__":
    if len(sys.argv) > 1:
        path = sys.argv[1]
    else:
        # Read file path from stdin
        input_data = sys.stdin.read().strip()
        try:
            parsed = json.loads(input_data)
            path = parsed.get("filePath", "")
        except Exception:
            path = input_data

    result = extract_pdf_text(path)
    print(json.dumps(result))
