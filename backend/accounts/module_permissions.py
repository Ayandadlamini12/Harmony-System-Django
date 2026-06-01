from .models import RoleModulePermission, User
from .role_modules import ROLE_MODULES


def default_role_module_permissions(role: str) -> dict[str, bool]:
    permissions = {}
    for module in ROLE_MODULES:
        key = module["key"]
        permissions[key] = role in module.get("default_roles", [])
        if module.get("locked_admin") and role == User.Role.ADMIN:
            permissions[key] = True
    return permissions


def role_module_permissions(role: str) -> dict[str, bool]:
    permissions = default_role_module_permissions(role)
    overrides = RoleModulePermission.objects.filter(role=role)
    for override in overrides:
        permissions[override.module_key] = override.enabled
    if role == User.Role.ADMIN:
        for module in ROLE_MODULES:
            if module.get("locked_admin"):
                permissions[module["key"]] = True
    return permissions


def module_enabled_for_role(role: str, module_key: str) -> bool:
    return role_module_permissions(role).get(module_key, False)
