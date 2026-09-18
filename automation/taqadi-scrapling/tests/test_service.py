"""Pure validation tests; Scrapling itself is imported lazily by the service."""

from __future__ import annotations

import os
import unittest
from unittest.mock import patch

from taqadi_scrapling.service import _valid_portal_url, _validate_items


class ServiceValidationTests(unittest.TestCase):
    def test_accepts_only_configured_https_portal_host(self) -> None:
        with patch.dict(os.environ, {
            "TAQADI_SCRAPLING_ALLOWED_HOSTS": "taqadi.sjc.gov.qa",
        }):
            self.assertTrue(_valid_portal_url(
                "https://taqadi.sjc.gov.qa/itc/form",
            ))
            self.assertFalse(_valid_portal_url(
                "http://taqadi.sjc.gov.qa/itc/form",
            ))
            self.assertFalse(_valid_portal_url(
                "https://attacker.example/itc/form",
            ))

    def test_rejects_unbounded_or_incomplete_selector_items(self) -> None:
        with self.assertRaises(ValueError):
            _validate_items([{"identifier": "id:x"}], "queries")
        with self.assertRaises(ValueError):
            _validate_items([{}] * 301, "queries")

    def test_normalizes_valid_selector_items(self) -> None:
        self.assertEqual(
            _validate_items([
                {"identifier": " id:CaseType ", "selector": " #CaseType "},
            ], "queries"),
            [{"identifier": "id:CaseType", "selector": "#CaseType"}],
        )


if __name__ == "__main__":
    unittest.main()
