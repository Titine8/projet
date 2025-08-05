from django.shortcuts import render

# Create your views here.
from rest_framework import generics
from .serializers import RegisterSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

# Inscription
class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer

# Connexion (JWT standard)
class LoginView(TokenObtainPairView):
    serializer_class = TokenObtainPairSerializer
