import os
import pandas as pd
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

# 🔹 Lister les dossiers de l'utilisateur
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_folders(request):
    user_root = os.path.join(settings.MEDIA_ROOT, request.user.username)
    if not os.path.exists(user_root):
        return Response({"folders": []})
    folders = [f for f in os.listdir(user_root) if os.path.isdir(os.path.join(user_root, f))]
    return Response({"folders": folders})

# 🔹 Lister les fichiers d’un dossier
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def folder_files(request):
    folder = request.GET.get("folder")
    user_folder = os.path.join(settings.MEDIA_ROOT, request.user.username, folder)
    if not os.path.exists(user_folder):
        return Response({"files": []})
    files = [f for f in os.listdir(user_folder) if f.endswith(('.csv', '.xlsx'))]
    return Response({"files": files})

# 🔹 Lister les colonnes d’un fichier
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def file_columns(request):
    folder = request.GET.get("folder")
    filename = request.GET.get("filename")
    filepath = os.path.join(settings.MEDIA_ROOT, request.user.username, folder, filename)

    if not os.path.exists(filepath):
        return Response({"columns": []}, status=404)

    if filename.endswith(".csv"):
        df = pd.read_csv(filepath)
    elif filename.endswith(".xlsx"):
        df = pd.read_excel(filepath)
    else:
        return Response({"error": "Format non supporté"}, status=400)

    columns = list(df.columns)
    return Response({"columns": columns})

# 🔹 Récupérer les données des colonnes sélectionnées
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def column_data(request):
    folder = request.GET.get("folder")
    filename = request.GET.get("filename")
    cols = request.GET.getlist("columns")

    filepath = os.path.join(settings.MEDIA_ROOT, request.user.username, folder, filename)
    if not os.path.exists(filepath):
        return Response({"error": "Fichier introuvable"}, status=404)

    if filename.endswith(".csv"):
        df = pd.read_csv(filepath)
    elif filename.endswith(".xlsx"):
        df = pd.read_excel(filepath)
    else:
        return Response({"error": "Format non supporté"}, status=400)

    missing_cols = [c for c in cols if c not in df.columns]
    if missing_cols:
        return Response({"error": f"Colonnes introuvables: {missing_cols}"}, status=400)

    data = df[cols].to_dict(orient="list")
    return Response({"data": data})
