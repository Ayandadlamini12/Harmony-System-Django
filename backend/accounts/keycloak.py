import requests
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.models import update_last_login
from rest_framework import serializers
from rest_framework.exceptions import APIException
from rest_framework_simplejwt.tokens import RefreshToken

from .auth_audit import get_lockout_status, record_authentication_event
from .models import AuthenticationEvent

User = get_user_model()


class KeycloakAuthenticationError(Exception):
    pass


class KeycloakProvisioningError(Exception):
    pass


class TemporaryLoginLockout(APIException):
    status_code = 429
    default_detail = {
        "code": "temporary_lockout",
        "detail": "Too many failed login attempts. Please try again later.",
    }
    default_code = "temporary_lockout"


def keycloak_enabled() -> bool:
    return bool(
        getattr(settings, "KEYCLOAK_ENABLED", False)
        and settings.KEYCLOAK_SERVER_URL
        and settings.KEYCLOAK_REALM
        and settings.KEYCLOAK_CLIENT_ID
    )


def keycloak_base_url() -> str:
    return settings.KEYCLOAK_SERVER_URL.rstrip("/")


def token_url() -> str:
    return f"{keycloak_base_url()}/realms/{settings.KEYCLOAK_REALM}/protocol/openid-connect/token"


def userinfo_url() -> str:
    return f"{keycloak_base_url()}/realms/{settings.KEYCLOAK_REALM}/protocol/openid-connect/userinfo"


def admin_token_url() -> str:
    return f"{keycloak_base_url()}/realms/master/protocol/openid-connect/token"


def admin_users_url() -> str:
    return f"{keycloak_base_url()}/admin/realms/{settings.KEYCLOAK_REALM}/users"


def keycloak_admin_enabled() -> bool:
    return bool(keycloak_enabled() and settings.KEYCLOAK_ADMIN_USERNAME and settings.KEYCLOAK_ADMIN_PASSWORD)


def keycloak_password_login(user_id: str, password: str) -> dict:
    data = {
        "grant_type": "password",
        "client_id": settings.KEYCLOAK_CLIENT_ID,
        "username": user_id,
        "password": password,
        "scope": "openid profile email",
    }
    if settings.KEYCLOAK_CLIENT_SECRET:
        data["client_secret"] = settings.KEYCLOAK_CLIENT_SECRET

    response = requests.post(token_url(), data=data, timeout=15)
    if response.status_code != 200:
        raise KeycloakAuthenticationError("Invalid User ID or password.")

    token_data = response.json()
    userinfo = requests.get(
        userinfo_url(),
        headers={"Authorization": f"Bearer {token_data['access_token']}"},
        timeout=15,
    )
    if userinfo.status_code != 200:
        raise KeycloakAuthenticationError("Keycloak login succeeded, but user profile lookup failed.")

    return {"tokens": token_data, "userinfo": userinfo.json()}


def keycloak_admin_access_token() -> str:
    if not keycloak_admin_enabled():
        raise KeycloakProvisioningError("Keycloak admin provisioning is not configured.")

    response = requests.post(
        admin_token_url(),
        data={
            "grant_type": "password",
            "client_id": "admin-cli",
            "username": settings.KEYCLOAK_ADMIN_USERNAME,
            "password": settings.KEYCLOAK_ADMIN_PASSWORD,
        },
        timeout=20,
    )
    if response.status_code != 200:
        raise KeycloakProvisioningError("Could not authenticate with Keycloak admin API.")
    return response.json()["access_token"]


def keycloak_headers(access_token: str) -> dict:
    return {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}


def find_keycloak_user(access_token: str, username: str) -> dict | None:
    response = requests.get(
        admin_users_url(),
        headers=keycloak_headers(access_token),
        params={"username": username.lower(), "exact": "true"},
        timeout=20,
    )
    if response.status_code != 200:
        raise KeycloakProvisioningError("Could not search Keycloak users.")
    users = response.json()
    return users[0] if users else None


def keycloak_user_payload(user: User, temporary_password: str | None = None) -> dict:
    payload = {
        "username": user.username.lower(),
        "email": user.email or "",
        "firstName": user.first_name or "",
        "lastName": user.last_name or "",
        "enabled": user.is_active,
        "emailVerified": False,
        "requiredActions": ["UPDATE_PASSWORD"],
        "attributes": {
            "harmony_user_id": [user.username.upper()],
            "harmony_role": [user.role],
        },
    }
    if temporary_password:
        payload["credentials"] = [
            {
                "type": "password",
                "value": temporary_password,
                "temporary": True,
            }
        ]
    return payload


def upsert_keycloak_user(user: User, temporary_password: str | None = None, send_password_email: bool = True) -> dict:
    access_token = keycloak_admin_access_token()
    headers = keycloak_headers(access_token)
    existing = find_keycloak_user(access_token, user.username)
    payload = keycloak_user_payload(user, temporary_password)

    if existing:
        user_id = existing["id"]
        response = requests.put(f"{admin_users_url()}/{user_id}", headers=headers, json=payload, timeout=20)
        if response.status_code not in {200, 204}:
            raise KeycloakProvisioningError("Could not update Keycloak user.")
    else:
        response = requests.post(admin_users_url(), headers=headers, json=payload, timeout=20)
        if response.status_code not in {201, 204}:
            raise KeycloakProvisioningError("Could not create Keycloak user.")
        created = find_keycloak_user(access_token, user.username)
        if not created:
            raise KeycloakProvisioningError("Keycloak user was created but could not be found.")
        user_id = created["id"]

    if send_password_email:
        actions_response = requests.put(
            f"{admin_users_url()}/{user_id}/execute-actions-email",
            headers=headers,
            params={"lifespan": settings.KEYCLOAK_ACTION_EMAIL_LIFESPAN},
            json=["UPDATE_PASSWORD"],
            timeout=30,
        )
        if actions_response.status_code not in {200, 204}:
            raise KeycloakProvisioningError("Could not send Keycloak password setup email.")

    return {"id": user_id, "username": user.username}


def role_from_keycloak(userinfo: dict) -> str:
    role = (
        userinfo.get("harmony_role")
        or userinfo.get("role")
        or userinfo.get("user_role")
        or User.Role.RECEPTIONIST
    )
    normalized = str(role).strip().lower()
    if normalized in {choice[0] for choice in User.Role.choices}:
        return normalized
    return User.Role.RECEPTIONIST


def sync_keycloak_user(user_id: str, userinfo: dict) -> User:
    email = userinfo.get("email") or ""
    first_name = userinfo.get("given_name") or ""
    last_name = userinfo.get("family_name") or ""

    user = User.objects.filter(username=user_id).first()
    if not user and email:
        user = User.objects.filter(email__iexact=email).first()

    created = user is None
    if created:
        user = User(username=user_id, role=role_from_keycloak(userinfo))
        user.set_unusable_password()

    user.username = user_id
    if email:
        user.email = email
    if first_name:
        user.first_name = first_name
    if last_name:
        user.last_name = last_name
    if not user.role:
        user.role = role_from_keycloak(userinfo)
    if created:
        user.is_active = True
    user.save()
    return user


class HarmonyTokenSerializer(serializers.Serializer):
    user_id = serializers.CharField(required=False, allow_blank=True)
    username = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user_id = (attrs.get("user_id") or attrs.get("username") or "").strip()
        password = attrs.get("password") or ""
        if not user_id or not password:
            raise serializers.ValidationError("User ID and password are required.")

        request = self.context.get("request")
        lockout = get_lockout_status(user_id)
        if lockout.locked:
            record_authentication_event(
                request=request,
                identifier=user_id,
                outcome=AuthenticationEvent.Outcome.BLOCKED,
                method=AuthenticationEvent.Method.UNKNOWN,
                reason_code="temporary_lockout",
            )
            raise TemporaryLoginLockout()

        user = None
        authentication_method = AuthenticationEvent.Method.LOCAL
        if keycloak_enabled():
            try:
                login_data = keycloak_password_login(user_id, password)
                user = sync_keycloak_user(user_id, login_data["userinfo"])
                authentication_method = AuthenticationEvent.Method.KEYCLOAK
            except KeycloakAuthenticationError:
                if not settings.KEYCLOAK_ALLOW_LOCAL_FALLBACK:
                    record_authentication_event(
                        request=request,
                        identifier=user_id,
                        outcome=AuthenticationEvent.Outcome.FAILURE,
                        method=AuthenticationEvent.Method.KEYCLOAK,
                        reason_code="invalid_credentials",
                        user=User.objects.filter(username__iexact=user_id).first(),
                    )
                    raise serializers.ValidationError("Invalid User ID or password.")
                authentication_method = AuthenticationEvent.Method.LOCAL_FALLBACK
            except requests.RequestException:
                if not settings.KEYCLOAK_ALLOW_LOCAL_FALLBACK:
                    record_authentication_event(
                        request=request,
                        identifier=user_id,
                        outcome=AuthenticationEvent.Outcome.FAILURE,
                        method=AuthenticationEvent.Method.KEYCLOAK,
                        reason_code="identity_service_unavailable",
                        user=User.objects.filter(username__iexact=user_id).first(),
                    )
                    raise serializers.ValidationError("Identity service unavailable. Please try again.")
                authentication_method = AuthenticationEvent.Method.LOCAL_FALLBACK

        if user is None:
            user = authenticate(username=user_id, password=password)

        if user is None or not user.is_active:
            record_authentication_event(
                request=request,
                identifier=user_id,
                outcome=AuthenticationEvent.Outcome.FAILURE,
                method=authentication_method,
                reason_code="invalid_credentials",
                user=User.objects.filter(username__iexact=user_id).first(),
            )
            raise serializers.ValidationError("Invalid User ID or password.")

        update_last_login(None, user)
        record_authentication_event(
            request=request,
            identifier=user_id,
            outcome=AuthenticationEvent.Outcome.SUCCESS,
            method=authentication_method,
            reason_code="authenticated",
            user=user,
        )
        refresh = RefreshToken.for_user(user)
        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }
