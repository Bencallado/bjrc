
import json
import sys
from pathlib import Path

import numpy as np
import pypdfium2 as pdfium
from paddleocr import PaddleOCR


MAX_PAGES = 30
RENDER_SCALE = 2.0


def extract_text(result):
    """Extract recognized text from PaddleOCR 3.x results."""
    texts = []

    if not isinstance(result, (list, tuple)):
        result = [result]

    for item in result:
        data = getattr(item, "json", None)

        if callable(data):
            data = data()

        if not isinstance(data, dict):
            continue

        payload = data.get("res", data)

        if not isinstance(payload, dict):
            continue

        recognized = payload.get("rec_texts", [])

        if isinstance(recognized, list):
            for text in recognized:
                cleaned = str(text).strip()

                if cleaned:
                    texts.append(cleaned)

    return texts


def main():
    if len(sys.argv) != 2:
        raise ValueError(
            "Usage: ocr_pdf.py <pdf_path>"
        )

    pdf_path = Path(sys.argv[1]).resolve()

    if not pdf_path.is_file():
        raise FileNotFoundError(
            "PDF file does not exist."
        )

    if pdf_path.suffix.lower() != ".pdf":
        raise ValueError(
            "Only PDF files are supported."
        )

    document = pdfium.PdfDocument(str(pdf_path))

    try:
        page_count = len(document)

        if page_count < 1:
            raise ValueError(
                "The PDF contains no pages."
            )

        if page_count > MAX_PAGES:
            raise ValueError(
                f"PDF has {page_count} pages. "
                f"Maximum: {MAX_PAGES}."
            )

        print(
            "Initializing PaddleOCR...",
            file=sys.stderr,
            flush=True
        )

        ocr = PaddleOCR(
            lang="en",
            device="cpu",
            enable_mkldnn=False
        )

        pages = []

        for page_index in range(page_count):
            page = document[page_index]

            try:
                bitmap = page.render(
                    scale=RENDER_SCALE
                )

                image = bitmap.to_pil().convert("RGB")

                try:
                    # PaddleOCR 3.7 expects a NumPy array
                    # or an image path, not a PIL Image.
                    image_array = np.array(image)

                    result = ocr.predict(
                        input=image_array
                    )

                    recognized_text = extract_text(result)

                finally:
                    image.close()

                page_text = "\n".join(
                    recognized_text
                )

                pages.append({
                    "page": page_index + 1,
                    "text": page_text,
                    "character_count": len(page_text)
                })

                status = (
                    "OK"
                    if page_text.strip()
                    else "WARNING: No text detected"
                )

                print(
                    f"Page {page_index + 1}/{page_count}: "
                    f"{status} "
                    f"({len(page_text)} characters)",
                    file=sys.stderr,
                    flush=True
                )

            finally:
                page.close()

        full_text = "\n\n".join(
            f"[PAGE {item['page']}]\n{item['text']}"
            for item in pages
        )

        total_characters = len(
            full_text.strip()
        )

        print(
            json.dumps({
                "success": True,
                "page_count": page_count,
                "total_characters": total_characters,
                "pages": pages,
                "text": full_text,
                "warning": (
                    "No readable text was detected."
                    if total_characters == 0
                    else None
                )
            }, ensure_ascii=False)
        )

    finally:
        document.close()


if __name__ == "__main__":
    try:
        main()

    except Exception as error:
        print(
            json.dumps({
                "success": False,
                "error": str(error)
            }, ensure_ascii=False),
            file=sys.stdout
        )

        sys.exit(1)

