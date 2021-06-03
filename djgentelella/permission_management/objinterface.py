from djgentelella.models import PermissionsCategoryManagement
from djgentelella.settings import Group, User


class PMUser:
    def __init__(self, request, form):
        self.form = form
        self.request = request

    def get_django_permissions(self, pk):
        perms = []
        q = self.form.cleaned_data['urlname']
        user = User.objects.get(pk=pk)
        if hasattr(user, 'gt_get_permission'):
            permission = user.gt_get_permission().all()
        else:
            permission = user.user_permissions.all()
        permission_list = PermissionsCategoryManagement.objects.filter(url_name__in=q.split(','))
        for perm in permission_list.filter(permission__in=permission).values(
                'permission',  'permission__name', 'permission__codename'):
                perms.append({'id': perm['permission'], 'name': perm['permission__name'],
                              'codename': perm['permission__codename']})
        return perms

    def get_permission_list(self):
        categories = {}
        q = self.form.cleaned_data['urlname']
        permissions_list = PermissionsCategoryManagement.objects.filter(url_name__in=q.split(',')). \
            values('category', 'permission', 'name')

        for perm in permissions_list:
            if perm['category'] not in categories:
                categories[perm['category']] = []

            categories[perm['category']].append({'id': perm['permission'],
                                                 'name': perm['name']})
        return categories

    def update_permission(self):
        user = self.form.cleaned_data['user']
        old_user_permission = set(map(lambda x: x["id"], self.get_django_permissions(self.form.cleaned_data['user'].pk)))
        set_permission_list = set(self.form.cleaned_data['permissions'].values('pk', flat=True))

        remove_permission = old_user_permission - set_permission_list
        add_permission = set_permission_list - old_user_permission
        # Check empty fields and clean permissions ?

        if hasattr(user, 'gt_rm_permission'):
            user.gt_rm_permission(remove_permission)
        else:
            user.item.user_permissions.remove(remove_permission)

        if hasattr(user, 'gt_add_permission'):
            user.gt_add_permission(add_permission)
        else:
            user.item.user_permissions.add(add_permission) # ? Permission.objects.filter(pk__in=add_permission)


class PMGroup:

    def __init__(self, request, form):
        self.form = form
        self.request = request

    def get_django_permissions(self, pk):
        perms = []
        q = self.form.cleaned_data['urlname']
        group = Group.objects.get(pk=pk)
        if hasattr(group, 'gt_get_permission'):
            permission = group.gt_get_permission().all()
        else:
            permission = group.permissions.all()
        permission_list = PermissionsCategoryManagement.objects.filter(url_name__in=q.split(','))
        for perm in permission_list.filter(permission__in=permission).values(
                'permission',  'permission__name', 'permission__codename'):
                perms.append({'id': perm['permission'], 'name': perm['permission__name'],
                              'codename': perm['permission__codename']})
        return perms

    def get_permission_list(self):
        categories = {}
        q = self.form.cleaned_data['urlname']
        permissions_list = PermissionsCategoryManagement.objects.filter(url_name__in=q.split(',')). \
            values('category', 'permission', 'name')

        for perm in permissions_list:
            if perm['category'] not in categories:
                categories[perm['category']] = []

            categories[perm['category']].append({'id': perm['permission'],
                                                 'name': perm['name']})
        return categories

    def update_permission(self):
        group = self.form.cleaned_data['group']
        old_user_permission = set(map(lambda x: x["id"], self.get_django_permissions(group.pk)))
        set_permission_list = set(self.form.cleaned_data['permissions'].values('pk', flat=True))

        remove_permission = old_user_permission - set_permission_list
        add_permission = set_permission_list - old_user_permission
        # Check empty fields and clean permissions ?

        if hasattr(group, 'gt_rm_permission'):
            group.gt_rm_permission(remove_permission)
        else:
            group.item.permissions.remove(remove_permission)

        if hasattr(group, 'gt_add_permission'):
            group.gt_add_permission(add_permission)
        else:
            group.item.permissions.add(add_permission) # ? Permission.objects.filter(pk__in=add_permission)


class ObjManager:
    @staticmethod
    def get_class(cls, request, form):
        if form.clean_data['option'] == 1:
            return PMUser(request, form)
        elif form.clean_data['option'] == 2:
            return PMGroup(request, form)