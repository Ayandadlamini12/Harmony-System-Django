from django.contrib.auth import get_user_model, password_validation
from django.core.exceptions import ValidationError
from rest_framework import serializers

from .models import ClinicianProfile

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
            "professional_title",
            "display_name",
            "professional_email",
            "professional_phone",
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
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = (
            "username",
            "email",
            "first_name",
            "last_name",
            "password",
            "confirm_password",
        )

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate(self, attrs):
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
