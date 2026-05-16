from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class HarmonyUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (("Harmony", {"fields": ("role",)}),)
    list_display = ("username", "email", "first_name", "last_name", "role", "is_active")
    list_filter = UserAdmin.list_filter + ("role",)

# Register your models here.
