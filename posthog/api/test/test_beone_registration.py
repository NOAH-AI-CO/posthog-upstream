from posthog.test.base import APIBaseTest
from unittest.mock import MagicMock, patch

from rest_framework import status


class TestBeOneRegistrationProxy(APIBaseTest):
    @patch("posthog.api.beone_registration.requests.get")
    def test_options_proxies_upstream_json(self, mock_get: MagicMock) -> None:
        mock_get.return_value = MagicMock(
            status_code=200,
            headers={"Content-Type": "application/json"},
            json=lambda: {
                "approval_required": True,
                "options": [{"kind": "hospital_level", "code": "level_3_a", "label": "三级甲等", "parent_code": ""}],
                "regions": [{"value": "33", "label": "浙江省", "children": [{"value": "3301", "label": "杭州市"}]}],
            },
        )

        response = self.client.get("/api/beone/registration/options/?lang=zh")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.json()["approval_required"])
        self.assertEqual(response.json()["regions"][0]["value"], "33")
        mock_get.assert_called_once()
        args, kwargs = mock_get.call_args
        self.assertTrue(str(args[0]).endswith("/api/registration/options/"))
        self.assertEqual(kwargs["params"]["lang"], "zh")

    @patch("posthog.api.beone_registration.requests.get")
    def test_hospitals_proxies_query_params(self, mock_get: MagicMock) -> None:
        mock_get.return_value = MagicMock(
            status_code=200,
            headers={"Content-Type": "application/json"},
            json=lambda: {
                "count": 1,
                "results": [
                    {
                        "code": "c45181f23abda62e4213",
                        "name": "浙江大学医学院附属邵逸夫医院",
                        "province": "33",
                        "city": "3301",
                    }
                ],
                "can_enter_other": True,
            },
        )

        response = self.client.get(
            "/api/beone/registration/hospitals/",
            {"q": "邵逸夫", "province": "33", "city": "3301", "lang": "zh"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["count"], 1)
        args, kwargs = mock_get.call_args
        self.assertTrue(str(args[0]).endswith("/api/registration/hospitals/"))
        self.assertEqual(kwargs["params"]["q"], "邵逸夫")
        self.assertEqual(kwargs["params"]["province"], "33")
        self.assertEqual(kwargs["params"]["city"], "3301")

    @patch("posthog.api.beone_registration.requests.get")
    def test_upstream_request_exception_returns_502(self, mock_get: MagicMock) -> None:
        import requests

        mock_get.side_effect = requests.ConnectionError("down")
        response = self.client.get("/api/beone/registration/options/")
        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertIn("unreachable", response.json()["detail"])
