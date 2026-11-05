from typing import Any
from urllib.parse import urljoin

from django.conf import settings

import requests
import structlog
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

logger = structlog.get_logger(__name__)


def _upstream_get(path: str, params: dict[str, Any]) -> Response:
    base = getattr(settings, "BEONE_API_BASE", "https://beonemed.ruosheng.bio").rstrip("/")
    timeout = float(getattr(settings, "BEONE_API_TIMEOUT_SECONDS", 10))
    url = urljoin(f"{base}/", path.lstrip("/"))
    query = {k: v for k, v in params.items() if v is not None and v != ""}
    try:
        upstream = requests.get(
            url,
            params=query,
            headers={"Accept": "application/json"},
            timeout=timeout,
        )
    except requests.RequestException as exc:
        logger.warning("beone_registration_upstream_error", path=path, error=str(exc))
        return Response(
            {"detail": "BeOne registration API unreachable", "error": str(exc)},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    content_type = upstream.headers.get("Content-Type", "application/json")
    try:
        payload: Any = upstream.json()
    except ValueError:
        logger.warning(
            "beone_registration_bad_json",
            path=path,
            status_code=upstream.status_code,
            body=upstream.text[:200],
        )
        return Response(
            {"detail": "BeOne registration API returned non-JSON", "status_code": upstream.status_code},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    response = Response(payload, status=upstream.status_code)
    # Preserve useful upstream metadata without leaking hop-by-hop headers.
    if "Retry-After" in upstream.headers:
        response["Retry-After"] = upstream.headers["Retry-After"]
    if content_type:
        response["Content-Type"] = content_type
    return response


class BeOneRegistrationOptionsView(APIView):
    """Authenticated proxy for BeOne R01 (registration dictionary + region tree)."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[
            OpenApiParameter(
                "lang",
                OpenApiTypes.STR,
                description="Upstream language for labels/errors, e.g. zh or en",
            ),
        ],
        responses={200: OpenApiTypes.OBJECT},
    )
    def get(self, request: Request) -> Response:
        return _upstream_get(
            "/api/registration/options/",
            {"lang": request.query_params.get("lang", "zh")},
        )


class BeOneRegistrationHospitalsView(APIView):
    """Authenticated proxy for BeOne R02 (hospital typeahead)."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[
            OpenApiParameter("q", OpenApiTypes.STR, description="Hospital name substring (max 80)"),
            OpenApiParameter("province", OpenApiTypes.STR, description="Province code, exact match"),
            OpenApiParameter("city", OpenApiTypes.STR, description="City code, exact match"),
            OpenApiParameter(
                "lang",
                OpenApiTypes.STR,
                description="Upstream language for labels/errors, e.g. zh or en",
            ),
        ],
        responses={200: OpenApiTypes.OBJECT},
    )
    def get(self, request: Request) -> Response:
        return _upstream_get(
            "/api/registration/hospitals/",
            {
                "q": request.query_params.get("q", ""),
                "province": request.query_params.get("province", ""),
                "city": request.query_params.get("city", ""),
                "lang": request.query_params.get("lang", "zh"),
            },
        )
