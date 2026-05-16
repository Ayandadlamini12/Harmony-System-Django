from django.contrib.auth import get_user_model
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .serializers import UserSerializer

User = get_user_model()


class IsAdminUserRole(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "admin")


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.order_by("first_name", "last_name", "username")
    serializer_class = UserSerializer
    permission_classes = [IsAdminUserRole]
    search_fields = ("first_name", "last_name", "email", "username")

    @action(detail=True, methods=["post"])
    def toggle_status(self, request, pk=None):
        user = self.get_object()
        user.is_active = not user.is_active
        user.save(update_fields=["is_active"])
        return Response(self.get_serializer(user).data)

# Create your views here.
