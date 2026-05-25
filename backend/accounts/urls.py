from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ChangePasswordView, EmployeeEnrollmentRequestViewSet, RegisterView, UserViewSet

router = DefaultRouter()
router.register("users", UserViewSet, basename="users")
router.register("employee-enrollment-requests", EmployeeEnrollmentRequestViewSet, basename="employee-enrollment-requests")

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/change-password/", ChangePasswordView.as_view(), name="change_password"),
] + router.urls
