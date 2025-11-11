import os
import pandas as pd
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.http import JsonResponse


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

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def file_data(request):
    username = request.GET.get("username")
    folder = request.GET.get("folder")
    filename = request.GET.get("file")  # récupère le nom du fichier

    if not username or not folder or not filename:
        return JsonResponse({"error": "username, folder et file sont requis"}, status=400)

    user_folder_path = os.path.join(settings.MEDIA_ROOT, username, folder,"analyse")
    file_path = os.path.join(user_folder_path, filename)
    
    if not os.path.exists(file_path):
        return JsonResponse({'error': 'Fichier non trouvé'}, status=404)

    # Lecture du fichier
    try:
        if filename.endswith('.csv'):
            df = pd.read_csv(file_path)
            
        elif filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(file_path)
           
        else:
            print("DEBUG file_data: Type de fichier non supporté")
           
    except Exception as e:
        print(f"DEBUG file_data: Erreur lecture fichier: {e}")
       

    # Limiter la taille des données renvoyées pour le frontend
    preview = df.head(100).to_dict(orient='records')  # seulement les 100 premières lignes

    columns = list(df.columns)

    response = {
        'shape': {'rows': df.shape[0], 'columns': df.shape[1]},
        'preview': preview,
        'columns': columns
    }

    print(response)
    return JsonResponse(response)

def influence_columns(request):
    import os
    import json
    import pandas as pd
    from django.conf import settings
    from django.http import JsonResponse
    from sklearn.preprocessing import LabelEncoder

    username = request.GET.get("username")
    folder = request.GET.get("folder")
    file_name = request.GET.get("file")

    if not username or not folder or not file_name:
        return JsonResponse({"error": "Paramètres manquants"}, status=400)

    user_folder = os.path.join(settings.MEDIA_ROOT, username, folder, "analyse")
    file_path = os.path.join(user_folder, file_name)
    cible_path = os.path.join(user_folder, "cible.json")
    stats_path = os.path.join(user_folder, "statistique_descriptive.json")
    visualisation_path = os.path.join(user_folder, "visualisation.json")
    encoded_file_path = os.path.join(user_folder, "file_encoded.csv")

    # Vérifier que le fichier encodé existe déjà
    if not os.path.exists(encoded_file_path):
        return JsonResponse({"error": "Le fichier encodé file_encoded.csv est introuvable. Générer d'abord les statistiques descriptives."}, status=404)

    # Lecture du fichier encodé
    try:
        df_encoded = pd.read_csv(encoded_file_path)
    except Exception as e:
        return JsonResponse({"error": f"Erreur lecture file_encoded.csv : {e}"}, status=400)

    # Lecture de la cible
    if not os.path.exists(cible_path):
        return JsonResponse({"error": "Fichier cible.json introuvable"}, status=404)
    try:
        with open(cible_path, "r", encoding="utf-8") as f:
            cible_data = json.load(f)
        vrai_nom_cible = cible_data.get("cible")
    except Exception as e:
        return JsonResponse({"error": f"Erreur lecture cible.json : {str(e)}"}, status=400)

    if not vrai_nom_cible or vrai_nom_cible not in df_encoded.columns:
        return JsonResponse({"error": f"La cible '{vrai_nom_cible}' est absente du fichier."}, status=400)

    # Lecture stats descriptives
    if not os.path.exists(stats_path):
        return JsonResponse({"error": "Fichier statistique_descriptive.json introuvable"}, status=404)
    try:
        with open(stats_path, "r", encoding="utf-8") as f:
            stats_json = json.load(f)
    except Exception as e:
        return JsonResponse({"error": f"Erreur lecture statistique_descriptive.json : {str(e)}"}, status=400)

    # 🔥 NOUVEAU : Calcul des corrélations entre toutes les variables (sans la cible)
    df_without_target = df_encoded.drop(columns=[vrai_nom_cible], errors='ignore')
    correlation_matrix = df_without_target.corr().abs()
    
    # Trouver les paires de variables les plus corrélées
    top_correlations = []
    for i in range(len(correlation_matrix.columns)):
        for j in range(i+1, len(correlation_matrix.columns)):
            var1 = correlation_matrix.columns[i]
            var2 = correlation_matrix.columns[j]
            corr_value = correlation_matrix.iloc[i, j]
            
            if not pd.isna(corr_value):
                top_correlations.append({
                    "var1": var1,
                    "var2": var2, 
                    "correlation": round(corr_value * 100, 2)
                })
    
    # Trier par corrélation décroissante et prendre les 2 meilleures
    top_correlations.sort(key=lambda x: x["correlation"], reverse=True)
    top_2_correlations = top_correlations[:2]

    # Calcul des influences avec la cible (existant)
    correlations = df_encoded.corrwith(df_encoded[vrai_nom_cible]).abs() * 100
    correlations = correlations.drop(labels=[vrai_nom_cible], errors="ignore")
    influences_result = [
        {"column": col, "influence": round(correlations[col] if not pd.isna(correlations[col]) else 0, 2)}
        for col in correlations.sort_values(ascending=False).head(5).index.tolist()
    ]

    # Limiter les valeurs à 100 lignes
    def get_stats_for_column(col_name):
        for col_stats in stats_json:
            if col_stats["nom_colonne"] == col_name:
                col_stats_copy = col_stats.copy()
                if col_name in df_encoded.columns:
                    col_stats_copy["values"] = df_encoded[col_name].fillna("N/A").tolist()[:100]
                return col_stats_copy
        if col_name in df_encoded.columns:
            return {"nom_colonne": col_name, "values": df_encoded[col_name].fillna("N/A").tolist()[:100]}
        return {}

    colonnes_result = [get_stats_for_column(col) for col in correlations.sort_values(ascending=False).head(5).index.tolist()]
    cible_stats = get_stats_for_column(vrai_nom_cible)
    cible_result = {"cible": cible_stats, "vrai_nom": vrai_nom_cible}

    # 🔥 NOUVEAU : Structure finale avec les corrélations
    final_data = {
        "message": "Influence et statistiques des colonnes calculées avec succès",
        "cible": cible_result,
        "influences": influences_result,
        "colonnes": colonnes_result,
        "correlations": top_2_correlations  # 🔥 NOUVEAU : Ajout des corrélations entre variables
    }

    # Sauvegarde visualisation.json
    try:
        with open(visualisation_path, "w", encoding="utf-8") as f:
            json.dump(final_data, f, ensure_ascii=False, indent=4)
    except Exception as e:
        return JsonResponse({"error": f"Erreur écriture visualisation.json : {str(e)}"}, status=500)

    return JsonResponse(final_data)
    import os
    import json
    import pandas as pd
    from django.conf import settings
    from django.http import JsonResponse
    from sklearn.preprocessing import LabelEncoder

    username = request.GET.get("username")
    folder = request.GET.get("folder")
    file_name = request.GET.get("file")

    if not username or not folder or not file_name:
        return JsonResponse({"error": "Paramètres manquants"}, status=400)

    user_folder = os.path.join(settings.MEDIA_ROOT, username, folder, "analyse")
    file_path = os.path.join(user_folder, file_name)
    cible_path = os.path.join(user_folder, "cible.json")
    stats_path = os.path.join(user_folder, "statistique_descriptive.json")
    visualisation_path = os.path.join(user_folder, "visualisation.json")
    encoded_file_path = os.path.join(user_folder, "file_encoded.csv")

    # Vérifier que le fichier encodé existe déjà
    if not os.path.exists(encoded_file_path):
        return JsonResponse({"error": "Le fichier encodé file_encoded.csv est introuvable. Générer d'abord les statistiques descriptives."}, status=404)

    # Lecture du fichier encodé
    try:
        df_encoded = pd.read_csv(encoded_file_path)
    except Exception as e:
        return JsonResponse({"error": f"Erreur lecture file_encoded.csv : {e}"}, status=400)

    # Lecture de la cible
    if not os.path.exists(cible_path):
        return JsonResponse({"error": "Fichier cible.json introuvable"}, status=404)
    try:
        with open(cible_path, "r", encoding="utf-8") as f:
            cible_data = json.load(f)
        vrai_nom_cible = cible_data.get("cible")
    except Exception as e:
        return JsonResponse({"error": f"Erreur lecture cible.json : {str(e)}"}, status=400)

    if not vrai_nom_cible or vrai_nom_cible not in df_encoded.columns:
        return JsonResponse({"error": f"La cible '{vrai_nom_cible}' est absente du fichier."}, status=400)

    # Lecture stats descriptives
    if not os.path.exists(stats_path):
        return JsonResponse({"error": "Fichier statistique_descriptive.json introuvable"}, status=404)
    try:
        with open(stats_path, "r", encoding="utf-8") as f:
            stats_json = json.load(f)
    except Exception as e:
        return JsonResponse({"error": f"Erreur lecture statistique_descriptive.json : {str(e)}"}, status=400)

    # Calcul des influences
    correlations = df_encoded.corrwith(df_encoded[vrai_nom_cible]).abs() * 100
    correlations = correlations.drop(labels=[vrai_nom_cible], errors="ignore")
    influences_result = [
        {"column": col, "influence": round(correlations[col] if not pd.isna(correlations[col]) else 0, 2)}
        for col in correlations.sort_values(ascending=False).head(5).index.tolist()
    ]

    # Limiter les valeurs à 100 lignes
    def get_stats_for_column(col_name):
        for col_stats in stats_json:
            if col_stats["nom_colonne"] == col_name:
                col_stats_copy = col_stats.copy()
                if col_name in df_encoded.columns:
                    col_stats_copy["values"] = df_encoded[col_name].fillna("N/A").tolist()[:100]
                return col_stats_copy
        if col_name in df_encoded.columns:
            return {"nom_colonne": col_name, "values": df_encoded[col_name].fillna("N/A").tolist()[:100]}
        return {}

    colonnes_result = [get_stats_for_column(col) for col in correlations.sort_values(ascending=False).head(5).index.tolist()]
    cible_stats = get_stats_for_column(vrai_nom_cible)
    cible_result = {"cible": cible_stats, "vrai_nom": vrai_nom_cible}

    final_data = {
        "message": "Influence et statistiques des colonnes calculées avec succès",
        "cible": cible_result,
        "influences": influences_result,
        "colonnes": colonnes_result,
    }

    # Sauvegarde visualisation.json
    try:
        with open(visualisation_path, "w", encoding="utf-8") as f:
            json.dump(final_data, f, ensure_ascii=False, indent=4)
    except Exception as e:
        return JsonResponse({"error": f"Erreur écriture visualisation.json : {str(e)}"}, status=500)

    return JsonResponse(final_data)
