from django.urls import path
from . import views

urlpatterns = [
    path('user_folders/', views.user_folders, name='user_folders'),
    path('folder_files/', views.folder_files, name='folder_files'),
    path('file_columns/', views.file_columns, name='file_columns'),
    path('column_data/', views.column_data, name='column_data'),
    path('file-data/', views.file_data, name='file_data'),
    path('influence-columns/', views.influence_columns, name='influence_columns'),
]
