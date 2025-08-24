from django.urls import path
from .views import encode_all_to_numeric
from .views import correlation_matrix

urlpatterns = [
    path('encode/', encode_all_to_numeric, name='encode_all_to_numeric'),
    path('correlation/', correlation_matrix, name='correlation_matrix'),  # nouvel endpoint
]
