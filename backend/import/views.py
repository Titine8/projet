import os
import shutil
from django.conf import settings
from django.core.files.storage import default_storage
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

class FileUploadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        user_folder = os.path.join(settings.MEDIA_ROOT, user.username)

        if not os.path.exists(user_folder):
            return Response({"folders": []}, status=status.HTTP_200_OK)

        # Liste uniquement les sous-dossiers directs du dossier utilisateur
        try:
            folders = [
                name for name in os.listdir(user_folder)
                if os.path.isdir(os.path.join(user_folder, name))
            ]
        except Exception:
            folders = []

        return Response({"folders": folders}, status=status.HTTP_200_OK)

    def post(self, request):
        user = request.user
        files = request.FILES.getlist("files")
        subfolder_name = request.POST.get("subfolder", "").strip()  # clé corrigée ici

        if not files:
            return Response({"error": "Aucun fichier envoyé."}, status=status.HTTP_400_BAD_REQUEST)

        if not subfolder_name:
            return Response({"error": "Nom du dossier requis."}, status=status.HTTP_400_BAD_REQUEST)

        if len(files) > 10:
            return Response({"error": "Maximum 10 fichiers autorisés."}, status=status.HTTP_400_BAD_REQUEST)

        allowed_extensions = ['.csv', '.xlsx', '.xls']

        final_path = os.path.join(settings.MEDIA_ROOT, user.username, subfolder_name)
        os.makedirs(final_path, exist_ok=True)

        for file in files:
            ext = os.path.splitext(file.name)[1].lower()
            if ext not in allowed_extensions:
                return Response({"error": f"Extension non autorisée: {ext}"}, status=status.HTTP_400_BAD_REQUEST)

            file_path = os.path.join(final_path, file.name)
            with default_storage.open(file_path, 'wb+') as destination:
                for chunk in file.chunks():
                    destination.write(chunk)

        return Response({"message": "Fichiers importés avec succès."}, status=status.HTTP_200_OK)


class FolderDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, folder_name):
        user = request.user
        # Nettoyer le nom pour éviter les traversals etc.
        folder_name = os.path.normpath(folder_name)
        if folder_name.startswith("..") or os.path.isabs(folder_name):
            return Response({"error": "Nom de dossier invalide."}, status=status.HTTP_400_BAD_REQUEST)

        folder_path = os.path.join(settings.MEDIA_ROOT, user.username, folder_name)

        if not os.path.exists(folder_path) or not os.path.isdir(folder_path):
            return Response({"error": "Dossier non trouvé."}, status=status.HTTP_404_NOT_FOUND)

        try:
            shutil.rmtree(folder_path)
        except Exception as e:
            return Response({"error": f"Erreur lors de la suppression: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({"message": "Dossier supprimé avec succès."}, status=status.HTTP_200_OK)
