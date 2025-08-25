# prediction/urls.py
from django.urls import path
from .views import split_data
from .views import find_best_regression_model

urlpatterns = [
    path('split-data/', split_data, name='split-data'),
    path('find_best_regression_model/<str:username>/<str:folder>/<str:target_col>/', find_best_regression_model),
]
