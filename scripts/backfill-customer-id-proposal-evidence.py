import argparse
import base64
import io
import json
import os
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

import pypdfium2 as pdfium


COMPANY_ID = "24bc0b21-4e2d-4413-9842-31719a3669f4"
BUCKET = "contract-documents"


def load_env(path: Path) -> None:
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key, value.strip().strip('"').strip("'"))


def require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value.rstrip("/")


def request_bytes(
    method: str,
    url: str,
    headers: dict[str, str],
    *,
    body: bytes | None = None,
    timeout: int = 120,
) -> bytes:
    request = Request(url, data=body, headers=headers, method=method)
    try:
        with urlopen(request, timeout=timeout) as response:
            return response.read()
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {error.code}: {detail}") from error


def render_pdf_page(pdf_bytes: bytes, page_number: int) -> bytes:
    pdf = pdfium.PdfDocument(pdf_bytes)
    try:
        if page_number < 1 or page_number > len(pdf):
            raise ValueError(f"Page {page_number} is outside the PDF page range")
        page = pdf[page_number - 1]
        bitmap = page.render(scale=2.5)
        image = bitmap.to_pil()
        output = io.BytesIO()
        image.save(output, format="PNG", optimize=True)
        return output.getvalue()
    finally:
        pdf.close()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument(
        "--ocr-crop",
        action="store_true",
        help="Send the rendered page to the OCR edge function to calculate a name crop.",
    )
    args = parser.parse_args()

    load_env(Path(__file__).resolve().parents[1] / ".env.taqadi-agent")
    base_url = require_env("TAQADI_SUPABASE_URL")
    service_key = require_env("TAQADI_SUPABASE_SERVICE_ROLE_KEY")
    auth_headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
    }

    params = {
        "select": (
            "id,page_number,contract_document_id,proposed_changes,extracted_data,"
            "contract_documents(document_name,file_path,mime_type)"
        ),
        "company_id": f"eq.{COMPANY_ID}",
        "status": "in.(pending,partial)",
        "evidence_image_path": "is.null",
        "order": "created_at.asc",
    }
    if args.limit > 0:
        params["limit"] = str(args.limit)

    proposals = json.loads(request_bytes(
        "GET",
        f"{base_url}/rest/v1/customer_id_scan_proposals?{urlencode(params)}",
        auth_headers,
        timeout=60,
    ).decode("utf-8"))
    print(f"Found {len(proposals)} proposals without evidence", flush=True)

    succeeded = 0
    cropped = 0
    failed = 0
    for index, proposal in enumerate(proposals, start=1):
        try:
            document = proposal.get("contract_documents") or {}
            file_path = document.get("file_path")
            page_number = proposal.get("page_number")
            document_id = proposal.get("contract_document_id")
            if not file_path or not page_number or not document_id:
                raise ValueError("Incomplete document data")

            pdf_bytes = request_bytes(
                "GET",
                f"{base_url}/storage/v1/object/authenticated/{BUCKET}/{quote(file_path, safe='/')}",
                auth_headers,
                timeout=120,
            )
            png_bytes = render_pdf_page(pdf_bytes, int(page_number))
            evidence_path = (
                f"id-scan-evidence/{COMPANY_ID}/{document_id}/page-{page_number}.png"
            )

            request_bytes(
                "POST",
                f"{base_url}/storage/v1/object/{BUCKET}/{quote(evidence_path, safe='/')}",
                {
                    **auth_headers,
                    "Content-Type": "image/png",
                    "x-upsert": "true",
                },
                body=png_bytes,
                timeout=120,
            )

            if args.ocr_crop:
                function_body = json.dumps({
                    "mode": "proposal_evidence",
                    "proposalId": proposal["id"],
                    "imageBase64": (
                        "data:image/png;base64," + base64.b64encode(png_bytes).decode("ascii")
                    ),
                    "evidenceImagePath": evidence_path,
                }).encode("utf-8")
                result = json.loads(request_bytes(
                    "POST",
                    f"{base_url}/functions/v1/contract-id-scanner",
                    {
                        **auth_headers,
                        "Content-Type": "application/json",
                    },
                    body=function_body,
                    timeout=180,
                ).decode("utf-8"))
                if not result.get("success"):
                    raise RuntimeError(result.get("error") or "Evidence function failed")
            else:
                changes = proposal.get("proposed_changes") or []
                values = {item.get("field"): item.get("proposed_value") for item in changes}
                extracted = proposal.get("extracted_data") or {}
                label = " ".join(filter(None, [
                    values.get("first_name_ar"), values.get("last_name_ar")
                ])).strip()
                if not label:
                    label = extracted.get("nameArabic") or extracted.get("name")
                update_body = json.dumps({
                    "evidence_image_bucket": BUCKET,
                    "evidence_image_path": evidence_path,
                    "evidence_crop": None,
                    "evidence_label": label,
                }).encode("utf-8")
                request_bytes(
                    "PATCH",
                    f"{base_url}/rest/v1/customer_id_scan_proposals?id=eq.{proposal['id']}",
                    {
                        **auth_headers,
                        "Content-Type": "application/json",
                        "Prefer": "return=minimal",
                    },
                    body=update_body,
                    timeout=60,
                )
                result = {"success": True, "cropFound": False}

            succeeded += 1
            if result.get("cropFound"):
                cropped += 1
            print(
                f"[{index}/{len(proposals)}] saved proposal={proposal['id']} "
                f"crop={bool(result.get('cropFound'))}",
                flush=True,
            )
        except Exception as error:
            failed += 1
            print(
                f"[{index}/{len(proposals)}] failed proposal={proposal.get('id')}: {error}",
                flush=True,
            )

    print(
        f"Complete: succeeded={succeeded} cropped={cropped} failed={failed}",
        flush=True,
    )


if __name__ == "__main__":
    main()
