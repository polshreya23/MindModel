#!/usr/bin/env python3
"""
ModelMind End-to-End PowerPoint (.pptx / .ppt), PDF & Text Integration Test
Tests:
1. Valid multi-slide .pptx generation & Python extraction (titles, bullets, tables, grouped shapes, order)
2. Express POST /api/upload-pptx full pipeline (PPTX -> NLP -> C++ DSA -> JSON + slide provenance)
3. Corrupted .pptx, empty 0-slide .pptx, unsupported .ppt (when LibreOffice absent), invalid extension
4. Temp file cleanup verification in uploads/
5. Existing PDF (/api/upload-pdf) & Text (/api/extract + /api/graph/build) regression checks
"""

import json
import os
import subprocess
import sys
import tempfile
import uuid
import urllib.request
import urllib.error

import fitz  # PyMuPDF
from pptx import Presentation
from pptx.util import Inches

BASE_URL = "http://localhost:3000"


def multipart_post(url: str, field_name: str, filename: str, file_bytes: bytes, mime_type: str):
    boundary = f"----ModelMindBoundary{uuid.uuid4().hex}"
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"\r\n'
        f"Content-Type: {mime_type}\r\n\r\n"
    ).encode("utf-8") + file_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Content-Length": str(len(body)),
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8")
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {"raw": raw}


def json_post(url: str, payload: dict):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.status, json.loads(resp.read().decode("utf-8"))


def build_sample_pptx(path: str):
    prs = Presentation()
    prs.core_properties.title = "Data Structures & Graph Algorithms Lecture"
    prs.core_properties.author = "Prof. Ada Lovelace"

    # Slide 1: Title Slide
    s1 = prs.slides.add_slide(prs.slide_layouts[0])
    s1.shapes.title.text = "Data Structures & Graph Algorithms"
    s1.placeholders[1].text = "Foundations of Trees, Heaps, and Shortest Path Traversal"

    # Slide 2: Bullet Points & Prerequisites
    s2 = prs.slides.add_slide(prs.slide_layouts[1])
    s2.shapes.title.text = "Binary Search Trees and Balancing"
    tf = s2.placeholders[1].text_frame
    tf.text = "Binary Search Tree is a hierarchical Data Structure for ordered keys."
    p2 = tf.add_paragraph()
    p2.text = "AVL Tree requires Binary Search Tree as a prerequisite for self-balancing rotations."
    p3 = tf.add_paragraph()
    p3.text = "Red-Black Tree provides balanced lookup with Time Complexity of O(log n)."

    # Slide 3: Table Slide
    s3 = prs.slides.add_slide(prs.slide_layouts[5])
    s3.shapes.title.text = "Algorithmic Complexity Comparison"
    table_shape = s3.shapes.add_table(4, 3, Inches(0.8), Inches(1.8), Inches(8.0), Inches(2.5))
    tbl = table_shape.table
    rows = [
        ["Data Structure", "Search Operation", "Time Complexity"],
        ["Hash Table", "Average Key Lookup", "O(1) Constant"],
        ["Trie Prefix Tree", "Prefix Autocomplete", "O(L) Length"],
        ["Max Heap", "Priority Extraction", "O(log n) Logarithmic"],
    ]
    for r_i, row in enumerate(rows):
        for c_i, val in enumerate(row):
            tbl.cell(r_i, c_i).text = val

    # Slide 4: Text Box + Graph Algorithms
    s4 = prs.slides.add_slide(prs.slide_layouts[5])
    s4.shapes.title.text = "Graph Traversal and Shortest Paths"
    tx = s4.shapes.add_textbox(Inches(0.8), Inches(1.8), Inches(8.0), Inches(3.0))
    tf4 = tx.text_frame
    tf4.text = "Adjacency List represents sparse Graph relationships efficiently."
    p4_2 = tf4.add_paragraph()
    p4_2.text = "Breadth-First Search and Depth-First Search require Adjacency List before learning Dijkstra Algorithm."
    p4_3 = tf4.add_paragraph()
    p4_3.text = "Topological Sort orders Directed Acyclic Graph prerequisites for curriculum planning."

    prs.save(path)


def build_empty_0slide_pptx(path: str):
    prs = Presentation()
    prs.save(path)


def build_sample_pdf(path: str):
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text(
        (72, 72),
        "Binary Search Trees and Graph Algorithms.\n"
        "Adjacency List is a prerequisite for Breadth-First Search and Dijkstra Algorithm.\n"
        "Max Heap maintains priority ordering for important concepts.",
    )
    doc.save(path)
    doc.close()


def main():
    print("==========================================================")
    print("  ModelMind PowerPoint, PDF & Text Integration Test Suite ")
    print("==========================================================")

    uploads_dir = os.path.join(os.getcwd(), "uploads")
    initial_uploads = set(os.listdir(uploads_dir)) if os.path.exists(uploads_dir) else set()

    with tempfile.TemporaryDirectory() as tmpdir:
        pptx_path = os.path.join(tmpdir, "lecture_dsa.pptx")
        empty_pptx_path = os.path.join(tmpdir, "empty_deck.pptx")
        corrupt_pptx_path = os.path.join(tmpdir, "corrupt_deck.pptx")
        legacy_ppt_path = os.path.join(tmpdir, "legacy_deck.ppt")
        pdf_path = os.path.join(tmpdir, "sample_notes.pdf")

        build_sample_pptx(pptx_path)
        build_empty_0slide_pptx(empty_pptx_path)
        with open(corrupt_pptx_path, "wb") as f:
            f.write(b"NOT_A_VALID_PPTX_ZIP_ARCHIVE_1234567890")
        with open(legacy_ppt_path, "wb") as f:
            f.write(b"\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1LEGACY_BINARY_PPT")
        build_sample_pdf(pdf_path)

        # TEST 1: Direct Python pptx_extractor.py test
        print("\n[TEST 1] Testing python_nlp/pptx_extractor.py directly...")
        proc = subprocess.run(
            ["python3", "python_nlp/pptx_extractor.py", pptx_path, "lecture_dsa.pptx"],
            capture_output=True,
            text=True,
            check=True,
        )
        py_res = json.loads(proc.stdout)
        assert py_res["success"] is True, f"Expected success, got {py_res}"
        assert py_res["metadata"]["slideCount"] == 4, f"Expected 4 slides, got {py_res['metadata']['slideCount']}"
        assert py_res["metadata"]["title"] == "Data Structures & Graph Algorithms Lecture"
        assert py_res["metadata"]["tableCount"] == 1
        assert [s["slideNumber"] for s in py_res["slides"]] == [1, 2, 3, 4], "Slide order not preserved!"
        assert "Hash Table" in py_res["slides"][2]["text"], "Table text missing from Slide 3!"
        assert "AVL Tree" in py_res["slides"][1]["text"], "Bullet text missing from Slide 2!"
        print(f"  ✓ Extracted {py_res['metadata']['slideCount']} slides in order, {py_res['metadata']['tableCount']} table, {py_res['metadata']['bulletCount']} bullets")

        # TEST 2: Express POST /api/upload-pptx full pipeline
        print("\n[TEST 2] Testing POST /api/upload-pptx full NLP + C++14 DSA pipeline...")
        with open(pptx_path, "rb") as f:
            status, api_res = multipart_post(
                f"{BASE_URL}/api/upload-pptx",
                "presentation",
                "lecture_dsa.pptx",
                f.read(),
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            )
        assert status == 200 and api_res.get("success") is True, f"Upload failed: {status} {api_res}"
        assert api_res["metadata"]["slideCount"] == 4
        assert api_res["summary"]["success"] is True, "TextRank summary failed"
        assert api_res["graphBuild"]["success"] is True, "C++ Graph build failed"
        assert len(api_res["graphBuild"]["graph"]["nodes"]) > 0, "No graph nodes generated"
        assert len(api_res["graphBuild"]["topologicalSort"]["curriculumOrder"]) > 0, "No topological sort order"
        assert len(api_res["graphBuild"]["heapTopK"]) > 0, "No Max-Heap ranking"
        assert len(api_res.get("slideReferences", {})) > 0, "No slide provenance references generated"
        print(
            f"  ✓ Full pipeline succeeded: {len(api_res['graphBuild']['graph']['nodes'])} nodes, "
            f"{len(api_res['graphBuild']['graph']['edges'])} edges, "
            f"{len(api_res['slideReferences'])} concepts mapped to source slides"
        )

        # TEST 3: Corrupted .pptx handling
        print("\n[TEST 3] Testing corrupted .pptx error handling...")
        with open(corrupt_pptx_path, "rb") as f:
            status, err_res = multipart_post(
                f"{BASE_URL}/api/upload-pptx",
                "presentation",
                "corrupt_deck.pptx",
                f.read(),
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            )
        assert status == 400 and err_res.get("success") is False, f"Expected 400 error, got {status} {err_res}"
        assert "corrupted" in err_res.get("error", "").lower() or "invalid" in err_res.get("error", "").lower()
        print(f"  ✓ Corrupted PPTX rejected cleanly: {err_res['error']}")

        # TEST 4: Empty 0-slide .pptx handling
        print("\n[TEST 4] Testing empty 0-slide .pptx error handling...")
        with open(empty_pptx_path, "rb") as f:
            status, err_res = multipart_post(
                f"{BASE_URL}/api/upload-pptx",
                "presentation",
                "empty_deck.pptx",
                f.read(),
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            )
        assert status == 400 and err_res.get("success") is False, f"Expected 400 error, got {status} {err_res}"
        print(f"  ✓ Empty PPTX rejected cleanly: {err_res['error']}")

        # TEST 5: Legacy .ppt handling (clear unsupported or conversion error)
        print("\n[TEST 5] Testing legacy .ppt handling...")
        with open(legacy_ppt_path, "rb") as f:
            status, err_res = multipart_post(
                f"{BASE_URL}/api/upload-pptx",
                "presentation",
                "legacy_deck.ppt",
                f.read(),
                "application/vnd.ms-powerpoint",
            )
        assert status == 400 and err_res.get("success") is False
        assert ".ppt" in err_res.get("error", "").lower()
        print(f"  ✓ Legacy .ppt handled explicitly (never silently ignored): {err_res['error']}")

        # TEST 6: Unsupported extension (.docx)
        print("\n[TEST 6] Testing unsupported extension (.docx)...")
        status, err_res = multipart_post(
            f"{BASE_URL}/api/upload-pptx",
            "presentation",
            "notes.docx",
            b"fake docx content",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
        assert status == 400 and err_res.get("success") is False
        print(f"  ✓ Unsupported file type rejected cleanly: {err_res['error']}")

        # TEST 7: Existing PDF endpoint regression check
        print("\n[TEST 7] Testing existing POST /api/upload-pdf regression...")
        with open(pdf_path, "rb") as f:
            status, pdf_res = multipart_post(
                f"{BASE_URL}/api/upload-pdf",
                "pdf",
                "sample_notes.pdf",
                f.read(),
                "application/pdf",
            )
        assert status == 200 and pdf_res.get("success") is True, f"PDF upload failed: {status} {pdf_res}"
        assert pdf_res["nlp"]["success"] is True
        print(f"  ✓ Existing PDF pipeline intact ({len(pdf_res['nlp']['nodes'])} concepts extracted)")

        # TEST 8: Existing Text NLP & C++ Graph regression check
        print("\n[TEST 8] Testing existing POST /api/extract & /api/graph/build regression...")
        s1, ext_res = json_post(
            f"{BASE_URL}/api/extract",
            {
                "text": "Binary Search Trees enable fast lookup. AVL Trees require Binary Search Trees for balanced height.",
                "maxSentences": 2,
            },
        )
        assert s1 == 200 and ext_res["success"] is True
        s2, build_res = json_post(
            f"{BASE_URL}/api/graph/build",
            {"nodes": ext_res["nlp"]["nodes"], "edges": ext_res["nlp"]["edges"]},
        )
        assert s2 == 200 and build_res["success"] is True
        print(f"  ✓ Existing Text -> NLP -> C++14 Graph pipeline intact ({build_res['stats']['nodeCount']} nodes)")

    # TEST 9: Verify temp files in uploads/ were cleaned up
    print("\n[TEST 9] Verifying temporary upload cleanup in uploads/...")
    after_uploads = set(os.listdir(uploads_dir)) if os.path.exists(uploads_dir) else set()
    leaked = after_uploads - initial_uploads
    assert len(leaked) == 0, f"Temp files leaked in uploads/: {leaked}"
    print("  ✓ Zero temporary upload files leaked in uploads/")

    print("\n==========================================================")
    print("  ALL POWERPOINT, PDF & TEXT INTEGRATION TESTS PASSED!    ")
    print("==========================================================")


if __name__ == "__main__":
    main()
