from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ChangePasswordView, RegisterView, UserViewSet

router = DefaultRouter()
router.register("users", UserViewSet, basename="users")

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/change-password/", ChangePasswordView.as_view(), name="change_password"),
] + router.urls
