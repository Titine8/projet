from django.urls import path
from .views import get_target_name, search_model, use_model, predict, search_model_prevision, use_model_prevision, get_dataset_data

urlpatterns = [
    path('get_target_name/', get_target_name, name='get-target-name'),
    path('search_model/', search_model, name='search-model'),
    path('use_model/', use_model, name='use-model'),
    path('predict/', predict, name='predict'),
    path('search_model_prevision/', search_model_prevision, name='search-model-prevision'),
    path('use_model_prevision/', use_model_prevision, name='use-model-prevision'),
    path('get_dataset_data/', get_dataset_data, name='get-dataset-data'),  # ← NOUVELLE ROUTE
]