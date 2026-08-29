"""Loopback-only Scrapling sidecar for the Fleetify Taqadi worker.

This service parses caller-supplied, redacted control maps. It never fetches a
URL, drives a browser, reads case documents, or submits a lawsuit.
"""

from __future__ import annotations

import hmac
import json
import os
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from . import __version__


HOST = "127.0.0.1"
DEFAULT_PORT = 4318
DEFAULT_MAX_REQUEST_BYTES = 4 * 1024 * 1024
MAX_ITEMS = 300


def _allowed_hosts() -> set[str]:
    raw = os.getenv("TAQADI_SCRAPLING_ALLOWED_HOSTS", "taqadi.sjc.gov.qa")
    return {host.strip().lower() for host in raw.split(",") if host.strip()}


def _valid_portal_url(value: object) -> bool:
    if not isinstance(value, str):
        return False
    parsed = urlparse(value)
    return parsed.scheme == "https" and (parsed.hostname or "").lower() in _allowed_hosts()


def _storage_file() -> Path:
    configured = os.getenv("TAQADI_SCRAPLING_STORAGE_DIR")
    root = Path(configured) if configured else Path.cwd() / ".taqadi-agent" / "scrapling"
    root.mkdir(parents=True, exist_ok=True)
    return root / "adaptive.sqlite"


def _selector(html: str, url: str):
    try:
        from scrapling.parser import Selector
    except ImportError as error:  # pragma: no cover - deployment diagnosis
        raise RuntimeError(
            "Scrapling is not installed. Run `uv sync --project automation/taqadi-scrapling`."
        ) from error
    return Selector(
        html,
        url=url,
        adaptive=True,
        storage_args={"storage_file": str(_storage_file()), "url": url},
    )


def _clean_text(value: object, limit: int = 300) -> str:
    if not isinstance(value, str):
        return ""
    return " ".join(value.split())[:limit]


def _attribute(element: Any, name: str) -> str | None:
    try:
        value = element.attrib.get(name)
    except (AttributeError, TypeError):
        value = None
    clean = _clean_text(value, 500)
    return clean or None


def _generated_selector(element: Any, attribute: str) -> str | None:
    value = getattr(element, attribute, None)
    try:
        value = value() if callable(value) else value
    except (AttributeError, TypeError, ValueError):
        return None
    clean = _clean_text(value, 1_000)
    return clean or None


def _element_text(element: Any) -> str:
    getter = getattr(element, "get_all_text", None)
    if callable(getter):
        try:
            return _clean_text(getter(strip=True))
        except (AttributeError, TypeError, ValueError):
            pass
    return _clean_text(getattr(element, "text", ""))


def _serialize_match(
    element: Any,
    *,
    identifier: str,
    source: str,
    similarity: float | None,
) -> dict[str, object]:
    return {
        "identifier": identifier,
        "source": source,
        "similarity": similarity,
        "id": _attribute(element, "id"),
        "name": _attribute(element, "name"),
        "label": _attribute(element, "data-adaptive-label")
        or _attribute(element, "aria-label")
        or _element_text(element),
        "cssSelector": _generated_selector(element, "generate_css_selector"),
        "xpathSelector": _generated_selector(element, "generate_xpath_selector"),
    }


def _validate_items(value: object, field: str) -> list[dict[str, str]]:
    if not isinstance(value, list) or len(value) > MAX_ITEMS:
        raise ValueError(f"{field} must be an array with at most {MAX_ITEMS} entries")
    result: list[dict[str, str]] = []
    for item in value:
        if not isinstance(item, dict):
            raise ValueError(f"{field} entries must be objects")
        identifier = _clean_text(item.get("identifier"), 500)
        selector = _clean_text(item.get("selector"), 1_000)
        if not identifier or not selector:
            raise ValueError(f"{field} entries require identifier and selector")
        result.append({"identifier": identifier, "selector": selector})
    return result


def remember(payload: dict[str, object]) -> dict[str, object]:
    url = payload.get("url")
    html = payload.get("html")
    if not _valid_portal_url(url) or not isinstance(html, str):
        raise ValueError("url must be an allowed Taqadi HTTPS URL and html must be text")
    seeds = _validate_items(payload.get("seeds"), "seeds")
    page = _selector(html, url)
    remembered = 0
    for seed in seeds:
        try:
            matches = page.css(
                seed["selector"],
                identifier=seed["identifier"],
                auto_save=True,
            )
            if matches:
                remembered += 1
        except (LookupError, TypeError, ValueError):
            continue
    return {"remembered": remembered, "requested": len(seeds)}


def resolve(payload: dict[str, object]) -> dict[str, object]:
    url = payload.get("url")
    html = payload.get("html")
    if not _valid_portal_url(url) or not isinstance(html, str):
        raise ValueError("url must be an allowed Taqadi HTTPS URL and html must be text")
    queries = _validate_items(payload.get("queries"), "queries")
    raw_percentage = payload.get("percentage", 80)
    if not isinstance(raw_percentage, (int, float)):
        raise ValueError("percentage must be numeric")
    percentage = max(70, min(100, int(raw_percentage)))
    page = _selector(html, url)
    matches: list[dict[str, object]] = []
    for query in queries:
        try:
            direct = page.css(
                query["selector"],
                identifier=query["identifier"],
                auto_save=True,
            )
            if direct:
                matches.append(_serialize_match(
                    direct[0],
                    identifier=query["identifier"],
                    source="direct",
                    similarity=100,
                ))
                continue
            adaptive = page.css(
                query["selector"],
                identifier=query["identifier"],
                adaptive=True,
                percentage=percentage,
            )
            if adaptive:
                similarity = getattr(adaptive[0], "similarity_score", percentage)
                if not isinstance(similarity, (int, float)):
                    similarity = percentage
                matches.append(_serialize_match(
                    adaptive[0],
                    identifier=query["identifier"],
                    source="adaptive",
                    similarity=float(similarity),
                ))
        except (LookupError, TypeError, ValueError):
            continue
    return {"matches": matches, "requested": len(queries)}


class ScraplingHandler(BaseHTTPRequestHandler):
    server_version = "FleetifyTaqadiScrapling/0.1"

    def log_message(self, format_: str, *args: object) -> None:
        print(f"[TaqadiScrapling] {self.address_string()} {format_ % args}")

    def _json(self, status: HTTPStatus, payload: dict[str, object]) -> None:
        encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(encoded)

    def _authorized(self) -> bool:
        expected = os.getenv("TAQADI_SCRAPLING_TOKEN", "")
        supplied = self.headers.get("Authorization", "")
        return len(expected) >= 24 and hmac.compare_digest(supplied, f"Bearer {expected}")

    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/health":
            self._json(HTTPStatus.OK, {
                "status": "ok",
                "version": __version__,
                "adaptive": True,
            })
            return
        self._json(HTTPStatus.NOT_FOUND, {"error": "not_found"})

    def do_POST(self) -> None:  # noqa: N802
        if self.path not in {"/v1/remember", "/v1/resolve"}:
            self._json(HTTPStatus.NOT_FOUND, {"error": "not_found"})
            return
        if not self._authorized():
            self._json(HTTPStatus.UNAUTHORIZED, {"error": "unauthorized"})
            return
        try:
            maximum = int(os.getenv(
                "TAQADI_SCRAPLING_MAX_REQUEST_BYTES",
                str(DEFAULT_MAX_REQUEST_BYTES),
            ))
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > maximum:
                self._json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {"error": "invalid_size"})
                return
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            if not isinstance(payload, dict):
                raise ValueError("request body must be an object")
            result = remember(payload) if self.path == "/v1/remember" else resolve(payload)
            self._json(HTTPStatus.OK, result)
        except (UnicodeDecodeError, json.JSONDecodeError, ValueError) as error:
            self._json(HTTPStatus.BAD_REQUEST, {"error": "invalid_request", "message": str(error)})
        except RuntimeError as error:
            self._json(HTTPStatus.SERVICE_UNAVAILABLE, {"error": "unavailable", "message": str(error)})
        except Exception as error:  # noqa: BLE001 - isolate malformed parser state per request
            print(f"[TaqadiScrapling] request failed: {type(error).__name__}")
            self._json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": "internal_error"})


def main() -> None:
    token = os.getenv("TAQADI_SCRAPLING_TOKEN", "")
    if len(token) < 24:
        raise SystemExit("TAQADI_SCRAPLING_TOKEN must contain at least 24 characters")
    port = int(os.getenv("TAQADI_SCRAPLING_PORT", str(DEFAULT_PORT)))
    server = ThreadingHTTPServer((HOST, port), ScraplingHandler)
    print(f"[TaqadiScrapling] listening on http://{HOST}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
