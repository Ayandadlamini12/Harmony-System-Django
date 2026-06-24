import hashlib
import secrets

from django.utils import timezone
from rest_framework import authentication, exceptions
from rest_framework.permissions import SAFE_METHODS

from .models import ApiToken


TOKEN_PREFIX = "hmis_"


def generate_api_token() -> str:
    return f"{TOKEN_PREFIX}{secrets.token_urlsafe(32)}"


def hash_api_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def token_display_prefix(raw_token: str) -> str:
    return raw_token[:18]


class ApiTokenAuthentication(authentication.BaseAuthentication):
    keyword = "HarmonyToken"

    def authenticate_header(self, request):
        return self.keyword

    def authenticate(self, request):
        raw_token = request.headers.get("X-Harmony-Api-Token", "").strip()
        if not raw_token:
            auth_header = authentication.get_authorization_header(request).decode("utf-8")
            if auth_header.startswith(f"{self.keyword} "):
                raw_token = auth_header.removeprefix(f"{self.keyword} ").strip()

        if not raw_token:
            return None

        token = ApiToken.objects.select_related("created_by").filter(token_hash=hash_api_token(raw_token)).first()
        if not token:
            raise exceptions.AuthenticationFailed("Invalid API token.")
        if token.is_revoked:
            raise exceptions.AuthenticationFailed("API token has been revoked.")
        if token.is_expired:
            raise exceptions.AuthenticationFailed("API token has expired.")
        if not token.created_by or not token.created_by.is_active:
            raise exceptions.AuthenticationFailed("API token owner is inactive.")
        if not self.scope_allows_request(token, request):
            raise exceptions.AuthenticationFailed("API token scope does not allow this request.")

        token.last_used_at = timezone.now()
        token.save(update_fields=["last_used_at", "updated_at"])
        request.api_token = token
        return (token.created_by, token)

    def scope_allows_request(self, token: ApiToken, request) -> bool:
        scopes = set(token.scopes or [])
        path = request.path.rstrip("/")
        if "write" in scopes:
            return True
        if "read" in scopes and request.method in SAFE_METHODS:
            return True
        if "audit_read" in scopes and request.method in SAFE_METHODS:
            return path.startswith("/api/audit-logs") or path.startswith("/api/authentication-events")
        if "calendar_sync" in scopes:
            return path.startswith("/api/appointments")
        if "n8n" in scopes:
            return path.startswith("/api/webhooks") or path.startswith("/api/zulip")
        return False
