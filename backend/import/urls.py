from django.urls import path
from .views import (
    FileUploadView, FolderDeleteView, FileDeleteView,
    FolderFilesView, FileColumnsView, save_relations, get_relations, check_relations_file,save_cible,get_cible, prepare_single_combined,create_relation,data_preview
)
urlpatterns = [
    path("upload/", FileUploadView.as_view(), name="file-upload"),
    path('folder/<str:folder_name>/data_preview/', data_preview, name='data_preview'),
    path("folder/<str:folder_name>/relations/", create_relation, name="create-relation"),
    path("folder/<str:folder_name>/prepare_single_combined/", prepare_single_combined, name="prepare-single-combined"),
    path("folder/<str:folder_name>/save_relations/", save_relations, name="save-relations"),
    path("folder/<str:folder_name>/get_relations/", get_relations, name="get-relations"),  # 👈 avant folder/<folder_name>/
    path("folder/<str:folder_name>/check_relations_file/", check_relations_file, name="check-relations"),
    path("folder/<str:folder_name>/save_cible/", save_cible, name="save_cible"),
    path("folder/<str:folder_name>/get_cible/", get_cible, name="get_cible"),
    path("folder/<str:folder_name>/files/", FolderFilesView.as_view(), name="folder-files"),
    path("folder/<str:folder_name>/<str:file_name>/columns/", FileColumnsView.as_view(), name="file-columns"),
    path("folder/<str:folder_name>/<str:file_name>/", FileDeleteView.as_view(), name="file-delete"),
    
    path("folder/<str:folder_name>/", FolderDeleteView.as_view(), name="folder-delete"),
    


]

