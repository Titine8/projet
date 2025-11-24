from django.urls import path
from .views import encode_all_to_numeric, correlation_matrix, influence_columns, chatbot, get_columns_list, get_chart_data

urlpatterns = [
    path('encode/', encode_all_to_numeric, name='encode_all_to_numeric'),
    path('correlation/', correlation_matrix, name='correlation_matrix'),
    path('influence/', influence_columns, name='influence_columns'),
    path('chatbot/', chatbot, name='chatbot'),
    path('columns/', get_columns_list, name='get_columns_list'),
    path('chart-data/', get_chart_data, name='get_chart_data'),
]