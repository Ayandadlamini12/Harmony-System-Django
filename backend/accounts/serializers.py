from django.contrib.auth import get_user_model, password_validation
from django.core.exceptions import ValidationError
from rest_framework import serializers

from .models import ClinicianProfile, EmailDeliveryLog, EmployeeEnrollmentRequest, RoleModulePermission, SystemEmailSettings
from .role_modules import ROLE_CHOICES, ROLE_MODULES

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="get_full_name", read_only=True)
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "name",
            "role",
            "is_active",
            "avatar_url",
            "password",
        )

    def get_avatar_url(self, obj):
        if not obj.profile_image:
            return None
        return "/api/account/avatar"

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class RoleModulePermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoleModulePermission
        fields = ("id", "role", "module_key", "enabled", "updated_at")
        read_only_fields = ("id", "updated_at")


class RoleModuleMatrixSerializer(serializers.Serializer):
    roles = serializers.ListField(child=serializers.CharField(), read_only=True)
    modules = serializers.ListField(child=serializers.DictField(), read_only=True)
    permissions = serializers.DictField(read_only=True)


def build_role_module_matrix():
    permissions = {
        role: {
            module["key"]: role in module["default_roles"]
            for module in ROLE_MODULES
        }
        for role in ROLE_CHOICES
    }
    for permission in RoleModulePermission.objects.all():
        if permission.role in permissions and permission.module_key in permissions[permission.role]:
            permissions[permission.role][permission.module_key] = permission.enabled

    return {
        "roles": list(ROLE_CHOICES),
        "modules": ROLE_MODULES,
        "permissions": permissions,
    }

class SystemEmailSettingsSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, trim_whitespace=False)
    brevo_api_key = serializers.CharField(write_only=True, required=False, allow_blank=True, trim_whitespace=False)
    password_is_set = serializers.BooleanField(read_only=True)
    brevo_api_key_is_set = serializers.BooleanField(read_only=True)

    class Meta:
        model = SystemEmailSettings
        fields = (
            "id",
            "is_enabled",
            "provider",
            "brevo_api_key",
            "brevo_api_key_is_set",
            "smtp_host",
            "smtp_port",
            "encryption",
            "username",
            "password",
            "password_is_set",
            "from_email",
            "from_name",
            "reply_to_email",
            "reply_to_name",
            "updated_at",
        )
        read_only_fields = ("id", "password_is_set", "brevo_api_key_is_set", "updated_at")

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        brevo_api_key = validated_data.pop("brevo_api_key", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        if password:
            instance.password = password
        if brevo_api_key:
            instance.brevo_api_key = brevo_api_key
        instance.save()
        return instance


class EmailDeliveryLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailDeliveryLog
        fields = (
            "id",
            "template_key",
            "provider",
            "status",
            "subject",
            "to",
            "from_email",
            "message_id",
            "metadata",
            "error",
            "created_at",
            "sent_at",
        )
        read_only_fields = fields


class ClinicianProfileSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    missing_sections = serializers.SerializerMethodField()

    class Meta:
        model = ClinicianProfile
        fields = (
            "id",
            "user",
            "user_name",
            "username",
            "full_names",
            "professional_title",
            "display_name",
            "professional_email",
            "professional_phone",
            "whatsapp_number",
            "telegram_number",
            "linkedin_url",
            "facebook_url",
            "portfolio_url",
            "bio",
            "clinical_interests",
            "education",
            "career_details",
            "awards_certifications",
            "affiliations",
            "profile_completion",
            "completed_sections",
            "missing_sections",
            "last_profile_reminder_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "user",
            "user_name",
            "username",
            "profile_completion",
            "completed_sections",
            "missing_sections",
            "last_profile_reminder_at",
            "created_at",
            "updated_at",
        )

    def get_missing_sections(self, obj):
        labels = {
            "personal_details": "Personal details",
            "education": "Education",
            "career_details": "Career details",
            "awards_certifications": "Awards / certifications",
            "affiliations": "Affiliations",
        }
        completed = set(obj.completed_sections or [])
        return [{"key": key, "label": labels[key]} for key in ClinicianProfile.SECTION_KEYS if key not in completed]


class RegisterSerializer(serializers.ModelSerializer):
    user_id = serializers.CharField(write_only=True, required=False, allow_blank=True)
    username = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = (
            "user_id",
            "username",
            "email",
            "first_name",
            "last_name",
            "password",
            "confirm_password",
        )

    def validate_username(self, value):
        if not value:
            return value
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this User ID already exists.")
        return value

    def validate(self, attrs):
        user_id = (attrs.pop("user_id", "") or attrs.get("username") or "").strip()
        if not user_id:
            raise serializers.ValidationError({"user_id": "User ID is required."})
        if User.objects.filter(username=user_id).exists():
            raise serializers.ValidationError({"user_id": "A user with this User ID already exists."})
        attrs["username"] = user_id
        if attrs["password"] != attrs.pop("confirm_password"):
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        try:
            password_validation.validate_password(attrs["password"])
        except ValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.role = "receptionist"
        user.save()
        return user


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)

    def validate_new_password(self, value):
        try:
            password_validation.validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value


class EmployeeEnrollmentRequestSerializer(serializers.ModelSerializer):
    reviewed_by_name = serializers.CharField(source="reviewed_by.get_full_name", read_only=True)

    class Meta:
        model = EmployeeEnrollmentRequest
        fields = (
            "id",
            "full_names",
            "email",
            "phone_number",
            "whatsapp_number",
            "telegram_chat_id",
            "telegram_username",
            "requested_role",
            "requested_team",
            "source",
            "status",
            "notes",
            "raw_payload",
            "review_email_sent_at",
            "review_email_error",
            "reviewed_by",
            "reviewed_by_name",
            "reviewed_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "status",
            "review_email_sent_at",
            "review_email_error",
            "reviewed_by",
            "reviewed_by_name",
            "reviewed_at",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        if not attrs.get("phone_number") and not attrs.get("email") and not attrs.get("telegram_chat_id"):
            raise serializers.ValidationError("At least one contact method is required.")
        return attrs
