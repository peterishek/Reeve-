from rest_framework.permissions import BasePermission


class IsStaffUser(BasePermission):
    """Restricts institution-wide/audit endpoints to bank staff accounts."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)
