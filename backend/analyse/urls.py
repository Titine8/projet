from django.urls import path
from .views import encode_all_to_numeric, correlation_matrix, influence_columns, chatbot

urlpatterns = [
    path('encode/', encode_all_to_numeric, name='encode_all_to_numeric'),
    path('correlation/', correlation_matrix, name='correlation_matrix'),
    path('influence/', influence_columns, name='influence_columns'),  # ✅ nouveau endpoint
    path('chatbot/', chatbot, name='chatbot'),
]
