#!/usr/bin/env python3
"""
ModelMind PowerPoint (.pptx / .ppt) Text & Structure Extractor
Uses python-pptx to extract presentation title, slide titles, text boxes,
grouped shapes, tables, bullet points, and slide order.
"""

import sys
import json
import os
import re
import shutil
import subprocess
import tempfile
import zipfile

try:
    from pptx import Presentation
    from pptx.enum.shapes import MSO_SHAPE_TYPE
    from pptx.exc import PackageNotFoundError
except ImportError:
    Presentation = None
    MSO_SHAPE_TYPE = None
    PackageNotFoundError = Exception


def _clean_text(s: str) -> str:
    if not s:
        return ""
    # Replace vertical tabs / non-breaking spaces / carriage returns
    s = s.replace("\x0b", " ").replace("\xa0", " ").replace("\r\n", "\n").replace("\r", "\n")
    s = re.sub(r"[ \t]+", " ", s)
    return s.strip()


def _ensure_terminal_punctuation(s: str) -> str:
    s = s.strip()
    if not s:
        return ""
    if s[-1] not in ".!?":
        return s + "."
    return s


def _extract_from_shape(shape, title_shape, body_lines: list, bullet_points: list, tables: list):
    """Recursively extracts text frames, bullet paragraphs, tables, and grouped shapes."""
    # 1. Grouped shapes
    if MSO_SHAPE_TYPE is not None and getattr(shape, "shape_type", None) == MSO_SHAPE_TYPE.GROUP:
        sub_shapes = list(getattr(shape, "shapes", []))
        sub_shapes.sort(key=lambda sh: (getattr(sh, "top", 0) or 0, getattr(sh, "left", 0) or 0))
        for sub in sub_shapes:
            _extract_from_shape(sub, title_shape, body_lines, bullet_points, tables)
        return

    # 2. Tables
    if getattr(shape, "has_table", False):
        table_data = []
        headers = []
        for r_idx, row in enumerate(shape.table.rows):
            row_cells = []
            for cell in row.cells:
                cell_txt = _clean_text(cell.text).replace("\n", " ")
                row_cells.append(cell_txt)
            if any(row_cells):
                table_data.append(row_cells)
                non_empty = [c for c in row_cells if c]
                if r_idx == 0:
                    headers = row_cells
                if non_empty:
                    if r_idx > 0 and headers and len(headers) == len(row_cells):
                        pairs = [
                            f"{headers[i]}: {row_cells[i]}"
                            for i in range(len(row_cells))
                            if headers[i] and row_cells[i]
                        ]
                        row_sentence = ", ".join(pairs) if pairs else " - ".join(non_empty)
                    else:
                        row_sentence = " - ".join(non_empty)
                    body_lines.append(row_sentence)
        if table_data:
            tables.append(table_data)
        return

    # 3. Text boxes & standard shapes with text frames
    if getattr(shape, "has_text_frame", False):
        is_title = title_shape is not None and shape == title_shape
        for p_idx, paragraph in enumerate(shape.text_frame.paragraphs):
            p_text = _clean_text(paragraph.text)
            if not p_text:
                continue
            # Skip the first line of the title shape since slideTitle already captures it
            if is_title and p_idx == 0:
                continue
            body_lines.append(p_text)
            # Track non-trivial paragraphs as bullet/list items
            if len(p_text) > 2:
                bullet_points.append(p_text)


def _convert_ppt_to_pptx(ppt_path: str, temp_dir: str) -> str:
    """Attempts reliable legacy .ppt -> .pptx conversion using LibreOffice."""
    soffice = shutil.which("soffice") or shutil.which("libreoffice")
    if not soffice:
        raise RuntimeError(
            "Unsupported legacy .ppt format: LibreOffice conversion utility is not installed on this server. "
            "Please convert or save your presentation as .pptx (PowerPoint Open XML) and upload again."
        )

    cmd = [
        soffice,
        "--headless",
        "--norestore",
        "--convert-to",
        "pptx",
        "--outdir",
        temp_dir,
        ppt_path,
    ]
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=60)
    if proc.returncode != 0:
        raise RuntimeError(
            f"Legacy .ppt conversion failed: {proc.stderr.strip() or proc.stdout.strip() or 'Unknown LibreOffice error'}. "
            "Please save the file as .pptx and re-upload."
        )

    base_name = os.path.splitext(os.path.basename(ppt_path))[0]
    converted_path = os.path.join(temp_dir, base_name + ".pptx")
    if not os.path.exists(converted_path):
        # Find any .pptx in temp_dir
        pptx_files = [f for f in os.listdir(temp_dir) if f.lower().endswith(".pptx")]
        if not pptx_files:
            raise RuntimeError("Legacy .ppt conversion did not produce a .pptx file. Please re-save as .pptx.")
        converted_path = os.path.join(temp_dir, pptx_files[0])
    return converted_path


def extract_pptx_content(file_path: str, original_filename: str = "") -> dict:
    if not file_path or not os.path.exists(file_path):
        return {"success": False, "error": f"Uploaded presentation file not found: {file_path}"}

    if os.path.getsize(file_path) == 0:
        return {"success": False, "error": "The uploaded PowerPoint file is empty (0 bytes)."}

    if Presentation is None:
        return {"success": False, "error": "python-pptx library is not installed on the server."}

    display_name = original_filename or os.path.basename(file_path)
    ext = os.path.splitext(display_name)[1].lower()
    if not ext:
        ext = os.path.splitext(file_path)[1].lower()

    temp_dir = None
    target_pptx_path = file_path
    source_format = "pptx"

    try:
        if ext == ".ppt":
            temp_dir = tempfile.mkdtemp(prefix="modelmind_ppt_")
            target_pptx_path = _convert_ppt_to_pptx(file_path, temp_dir)
            source_format = "ppt (converted to pptx)"
        elif ext != ".pptx":
            return {
                "success": False,
                "error": f"Unsupported file extension '{ext}'. Please upload a .pptx or .ppt PowerPoint presentation."
            }

        try:
            prs = Presentation(target_pptx_path)
        except (PackageNotFoundError, zipfile.BadZipFile, KeyError, ValueError):
            return {
                "success": False,
                "error": f"Corrupted or invalid PowerPoint file '{display_name}'. Please ensure the file is a valid .pptx Open XML presentation."
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Unable to open PowerPoint presentation '{display_name}': {str(e)}"
            }

        slide_count = len(prs.slides)
        if slide_count == 0:
            return {
                "success": False,
                "error": "The PowerPoint presentation contains 0 slides."
            }

        slides_out = []
        nlp_segments = []
        total_tables = 0
        total_bullets = 0
        first_slide_title = ""

        for idx, slide in enumerate(prs.slides, start=1):
            title_shape = getattr(slide.shapes, "title", None)
            slide_title = ""
            if title_shape is not None and getattr(title_shape, "has_text_frame", False):
                first_para = title_shape.text_frame.paragraphs[0].text if title_shape.text_frame.paragraphs else title_shape.text
                slide_title = _clean_text(first_para).replace("\n", " ")

            if idx == 1 and slide_title:
                first_slide_title = slide_title

            body_lines = []
            bullet_points = []
            tables = []

            # Sort shapes spatially (top to bottom, left to right) for natural reading order
            shapes = list(slide.shapes)
            shapes.sort(key=lambda sh: (getattr(sh, "top", 0) or 0, getattr(sh, "left", 0) or 0))

            for shape in shapes:
                _extract_from_shape(shape, title_shape, body_lines, bullet_points, tables)

            # Extract speaker notes if present
            notes_text = ""
            if getattr(slide, "has_notes_slide", False):
                try:
                    tf = slide.notes_slide.notes_text_frame
                    if tf:
                        notes_text = _clean_text(tf.text)
                except Exception:
                    notes_text = ""

            total_tables += len(tables)
            total_bullets += len(bullet_points)

            # Combine slide text cleanly
            slide_parts = []
            if slide_title:
                slide_parts.append(slide_title)
            slide_parts.extend(body_lines)
            if notes_text:
                slide_parts.append(notes_text)

            slide_raw_text = "\n".join(slide_parts).strip()

            # Format slide text with proper terminal punctuation for holistic NLP sentence extraction
            nlp_lines = []
            if slide_title:
                nlp_lines.append(_ensure_terminal_punctuation(slide_title))
            for line in body_lines:
                nlp_lines.append(_ensure_terminal_punctuation(line))
            if notes_text:
                for nline in notes_text.split("\n"):
                    nline = nline.strip()
                    if nline:
                        nlp_lines.append(_ensure_terminal_punctuation(nline))

            if nlp_lines:
                nlp_segments.append(" ".join(nlp_lines))

            slides_out.append({
                "slideNumber": idx,
                "title": slide_title or f"Slide {idx}",
                "text": slide_raw_text,
                "bulletPoints": bullet_points,
                "tables": tables,
                "notes": notes_text,
                "charCount": len(slide_raw_text)
            })

        unified_text = "\n\n".join(nlp_segments).strip()
        if not unified_text or len(unified_text) < 15:
            return {
                "success": False,
                "error": "No extractable text found in presentation slides (slides may be blank or contain only uncaptioned images)."
            }

        core_title = _clean_text(getattr(prs.core_properties, "title", "") or "")
        core_author = _clean_text(getattr(prs.core_properties, "author", "") or "")
        fallback_title = os.path.splitext(display_name)[0].replace("_", " ").replace("-", " ").strip()
        presentation_title = core_title or first_slide_title or fallback_title or "PowerPoint Presentation"

        metadata = {
            "title": presentation_title,
            "author": core_author,
            "slideCount": slide_count,
            "tableCount": total_tables,
            "bulletCount": total_bullets,
            "charCount": len(unified_text),
            "wordCount": len(unified_text.split()),
            "sourceFormat": source_format,
            "filename": display_name,
        }

        return {
            "success": True,
            "text": unified_text,
            "slides": slides_out,
            "metadata": metadata,
        }

    except RuntimeError as e:
        return {"success": False, "error": str(e)}
    except Exception as e:
        return {"success": False, "error": f"PowerPoint extraction error: {str(e)}"}
    finally:
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)


if __name__ == "__main__":
    orig_name = ""
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        if len(sys.argv) > 2:
            orig_name = sys.argv[2]
    else:
        input_data = sys.stdin.read().strip()
        try:
            parsed = json.loads(input_data)
            file_path = parsed.get("filePath", "")
            orig_name = parsed.get("originalFilename", "")
        except Exception:
            file_path = input_data

    result = extract_pptx_content(file_path, orig_name)
    print(json.dumps(result))
