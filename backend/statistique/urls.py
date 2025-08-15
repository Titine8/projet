from django.urls import path
from . import views

urlpatterns = [
    path("files/", views.list_files),
    path('<str:username>/<str:folder>/<str:filename>/', views.descriptive_stats, name='descriptive-stats'),
]
