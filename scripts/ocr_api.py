import asyncio
import hmac
import json
import os
import subprocess
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, Header, HTTPException, UploadFile

app = FastAPI(title="BJRC OCR Service")

API_KEY = os.environ.get("OCR_API_KEY", "")
MAX_FILE_SIZE = 20 * 1024 * 1024
CHUNK_SIZE = 1024 * 1024
OCR_SCRIPT = Path("/app/ocr_pdf.py")
OCR_SEMAPHORE = asyncio.Semaphore(1)


@app.get("/health")
def health():
    return {"status": "ok", "service": "bjrc-ocr"}


@app.post("/ocr")
async def perform_ocr(
    file: UploadFile = File(...),
    authorization: str = Header(default="")
):
    try:
        if not API_KEY:
            raise HTTPException(
                status_code=503,
                detail="OCR service is not configured."
            )

        expected = f"Bearer {API_KEY}"
        if not hmac.compare_digest(authorization, expected):
            raise HTTPException(status_code=401, detail="Unauthorized.")

        if not file.filename or Path(file.filename).suffix.lower() != ".pdf":
            raise HTTPException(
                status_code=400,
                detail="Only PDF files are supported."
            )

        with tempfile.TemporaryDirectory() as temp_dir:
            pdf_path = Path(temp_dir) / "upload.pdf"

            header = await file.read(5)
            if header != b"%PDF-":
                raise HTTPException(
                    status_code=400,
                    detail="Invalid PDF file."
                )

            total_size = len(header)

            with pdf_path.open("wb") as destination:
                destination.write(header)

                while True:
                    chunk = await file.read(CHUNK_SIZE)
                    if not chunk:
                        break

                    total_size += len(chunk)

                    if total_size > MAX_FILE_SIZE:
                        raise HTTPException(
                            status_code=413,
                            detail="PDF exceeds the 20 MB limit."
                        )

                    destination.write(chunk)

            async with OCR_SEMAPHORE:
                process = await asyncio.create_subprocess_exec(
                    "python",
                    str(OCR_SCRIPT),
                    str(pdf_path),
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )

                communication = asyncio.create_task(process.communicate())

                try:
                    stdout, stderr = await asyncio.wait_for(
                        asyncio.shield(communication),
                        timeout=600
                    )
                except asyncio.TimeoutError:
                    process.kill()
                    await communication
                    raise HTTPException(
                        status_code=504,
                        detail="OCR processing timed out."
                    )

                if process.returncode != 0:
                    raise HTTPException(
                        status_code=422,
                        detail="OCR processing failed."
                    )

                try:
                    response = json.loads(stdout.decode("utf-8"))
                except (json.JSONDecodeError, UnicodeDecodeError):
                    raise HTTPException(
                        status_code=500,
                        detail="Invalid OCR service response."
                    )

                if not isinstance(response, dict) or not response.get("success"):
                    raise HTTPException(
                        status_code=422,
                        detail="OCR processing failed."
                    )

                return response

    finally:
        await file.close()
