# urls.py
from django.urls import path
from . import views

urlpatterns = [
    path("files/", views.list_files),
    path("file-data/", views.file_data),
    path('<str:username>/<str:folder>/<str:filename>/', views.descriptive_stats, name='descriptive-stats'),
    path('<str:username>/<str:folder>/<str:filename>/info/', views.file_info, name='file-info'), # Cette ligne doit exister
]