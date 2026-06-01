import requests
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class KeycloakAuthenticationError(Exception):
    pass


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

        user = None
        if keycloak_enabled():
            try:
                login_data = keycloak_password_login(user_id, password)
                user = sync_keycloak_user(user_id, login_data["userinfo"])
            except KeycloakAuthenticationError:
                if not settings.KEYCLOAK_ALLOW_LOCAL_FALLBACK:
                    raise serializers.ValidationError("Invalid User ID or password.")
            except requests.RequestException:
                if not settings.KEYCLOAK_ALLOW_LOCAL_FALLBACK:
                    raise serializers.ValidationError("Identity service unavailable. Please try again.")

        if user is None:
            user = authenticate(username=user_id, password=password)

        if user is None or not user.is_active:
            raise serializers.ValidationError("Invalid User ID or password.")

        refresh = RefreshToken.for_user(user)
        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }
