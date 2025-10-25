# urls.py
from django.urls import path
from . import views

urlpatterns = [
     path('<str:username>/<str:folder>/stats-json/', views.get_descriptive_stats, name='get-descriptive-stats'),
    path("files/", views.list_files),
    path("file-data/", views.file_data),
    path('<str:username>/<str:folder>/<str:filename>/', views.descriptive_stats, name='descriptive-stats'),
   
]