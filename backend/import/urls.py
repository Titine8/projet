from django.urls import path
from .views import FileUploadView, FolderDeleteView

urlpatterns = [
    path('upload/', FileUploadView.as_view(), name='file-upload'),
    path('folder/<str:folder_name>/', FolderDeleteView.as_view(), name='folder-delete'),
]
