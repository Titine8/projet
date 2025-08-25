import os
import pandas as pd
from django.conf import settings
from django.http import JsonResponse
from sklearn.preprocessing import LabelEncoder

def encode_all_to_numeric(request):
    username = request.GET.get("username")
    folder = request.GET.get("folder")
    file_name = request.GET.get("file")

    if not username or not folder or not file_name:
        return JsonResponse({"error": "Paramètres manquants"}, status=400)

    user_folder = os.path.join(settings.MEDIA_ROOT, username, folder)
    file_path = os.path.join(user_folder, file_name)

    if not os.path.exists(file_path):
        return JsonResponse({"error": "Fichier introuvable"}, status=404)

    # Nom du fichier encodé
    original_name = file_name.replace("file_", "")
    encoded_file_name = f"encodage_{original_name}"
    encoded_file_path = os.path.join(user_folder, encoded_file_name)

    # Vérifier si le fichier encodé existe déjà
    if os.path.exists(encoded_file_path):
        return JsonResponse({
            "message": "Le fichier encodé existe déjà",
            "encoded_file": encoded_file_name
        })

    # Lecture du CSV original
    try:
        df = pd.read_csv(file_path)
    except Exception as e:
        return JsonResponse({"error": f"Erreur lecture CSV : {str(e)}"}, status=400)

    # Colonnes catégorielles
    categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()

    # Encodage LabelEncoder
    le_dict = {}
    for col in categorical_cols:
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col].astype(str))
        le_dict[col] = list(le.classes_)

    # Sauvegarde seulement si fichier n'existe pas
    df.to_csv(encoded_file_path, index=False, encoding="utf-8")

    return JsonResponse({
        "message": "Encodage terminé : toutes les colonnes sont numériques",
        "encoded_file": encoded_file_name,
        "columns": list(df.columns),
        "categorical_columns": categorical_cols,
        "classes_mapping": le_dict,
        "rows": len(df)
    })

def correlation_matrix(request):
    username = request.GET.get("username")
    folder = request.GET.get("folder")
    file_name = request.GET.get("file")  # fichier encodé attendu

    if not username or not folder or not file_name:
        return JsonResponse({"error": "Paramètres manquants"}, status=400)

    if not file_name.startswith("encodage_"):
        return JsonResponse({"error": "Le fichier doit être un fichier encodé (préfixe encodage_)"},
                            status=400)

    user_folder = os.path.join(settings.MEDIA_ROOT, username, folder)
    file_path = os.path.join(user_folder, file_name)

    if not os.path.exists(file_path):
        return JsonResponse({"error": "Fichier encodé introuvable"}, status=404)

    try:
        df = pd.read_csv(file_path)
    except Exception as e:
        return JsonResponse({"error": f"Erreur lecture CSV : {str(e)}"}, status=400)

    numeric_df = df.select_dtypes(include='number')
    if numeric_df.empty:
        return JsonResponse({"error": "Aucune colonne numérique pour la corrélation"}, status=400)

    # Matrice de corrélation Pearson (défaut)
    pearson_corr = numeric_df.corr(method='pearson').to_dict()

    # Matrice de corrélation Spearman (non-linéaire)
    spearman_corr = numeric_df.corr(method='spearman').to_dict()

    return JsonResponse({
        "message": "Matrices de corrélation générées",
        "pearson": pearson_corr,
        "spearman": spearman_corr,
        "columns": list(numeric_df.columns)
    })

