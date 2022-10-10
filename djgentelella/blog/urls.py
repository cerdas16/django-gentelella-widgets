
from django.urls import path

from . import views

app_name = 'blog'
urlpatterns = [
    path('', views.EntriesList.as_view(), name='entrylist'),
    path('entry/create', views.EntryCreate.as_view(), name='entrycreate'),
    path('entry/<int:pk>/', views.EntryUpdate.as_view(), name='entry_update'),
    path('entry/<int:pk>/delete', views.EntryDelete.as_view(), name='entry_delete'),
    path('category/create', views.category_add, name='category_add'),
    path('published/<slug:slug>/', views.EntryDetail.as_view(), name='entrydetail'),
]