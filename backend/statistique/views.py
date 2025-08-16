import os
import pandas as pd
from django.conf import settings
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from scipy.stats import skew, kurtosis


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_files(request):
    username = request.GET.get("username")
    folder = request.GET.get("folder")
    if not username or not folder:
        return JsonResponse({"error": "username et folder sont requis"}, status=400)

    user_folder_path = os.path.join(settings.MEDIA_ROOT, username, folder)

    if not os.path.exists(user_folder_path):
        return JsonResponse({"files": []})

    files = [
        f for f in os.listdir(user_folder_path)
        if os.path.isfile(os.path.join(user_folder_path, f))
    ]

    return JsonResponse({"files": files})

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def file_data(request):
    username = request.GET.get("username")
    folder = request.GET.get("folder")
    filename = request.GET.get("file")  # récupère le nom du fichier

    if not username or not folder or not filename:
        return JsonResponse({"error": "username, folder et file sont requis"}, status=400)

    user_folder_path = os.path.join(settings.MEDIA_ROOT, username, folder)
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
            return JsonResponse({'error': 'Type de fichier non supporté'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

    # Limiter la taille des données renvoyées pour le frontend
    preview = df.head(100).to_dict(orient='records')  # seulement les 100 premières lignes

    response = {
        'shape': {'rows': df.shape[0], 'columns': df.shape[1]},
        'preview': preview,
        'columns': list(df.columns)
    }

    return JsonResponse(response)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def descriptive_stats(request, username, folder, filename):
    user_folder = os.path.join(settings.MEDIA_ROOT, username, folder)
    file_path = os.path.join(user_folder, filename)

    if not os.path.exists(file_path):
        return JsonResponse({'error': 'Fichier non trouvé'}, status=404)

    # Lire le fichier
    try:
        if filename.endswith('.csv'):
            df = pd.read_csv(file_path)
        elif filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(file_path)
        else:
            return JsonResponse({'error': 'Type de fichier non supporté'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

    stats = []

    for col in df.columns:
        data = df[col]
        col_stats = {
            'Nom de la colonne': col,
            'Type': str(data.dtype),
            'Nb valeurs': int(data.count()),
            'Nb valeurs manquantes': int(data.isna().sum()),
            'Nb valeurs uniques': int(data.nunique()),
            'Mode / Valeur fréquente': str(data.mode().iloc[0]) if not data.mode().empty else None,
        }

        if pd.api.types.is_numeric_dtype(data):
            # Statistiques numériques
            clean_data = data.dropna()
            q1 = clean_data.quantile(0.25) if not clean_data.empty else np.nan
            q3 = clean_data.quantile(0.75) if not clean_data.empty else np.nan
            iqr = q3 - q1 if not clean_data.empty else np.nan

            # Détection des outliers
            outliers = [float(x) for x in clean_data[(clean_data < (q1 - 1.5 * iqr)) | 
                                                     (clean_data > (q3 + 1.5 * iqr))]] if not clean_data.empty else []

            col_stats.update({
                'Moyenne': float(clean_data.mean()) if not clean_data.empty else np.nan,
                'Médiane': float(clean_data.median()) if not clean_data.empty else np.nan,
                'Min': float(clean_data.min()) if not clean_data.empty else np.nan,
                'Max': float(clean_data.max()) if not clean_data.empty else np.nan,
                'Écart-type': float(clean_data.std()) if not clean_data.empty else np.nan,
                'Variance': float(clean_data.var()) if not clean_data.empty else np.nan,
                'Q1': float(q1) if not clean_data.empty else np.nan,
                'Q3': float(q3) if not clean_data.empty else np.nan,
                'IQR': float(iqr) if not clean_data.empty else np.nan,
                'Skewness': float(skew(clean_data)) if len(clean_data) > 2 else np.nan,
                'Kurtosis': float(kurtosis(clean_data)) if len(clean_data) > 3 else np.nan,
                'Fréquence top 5 catégories': 'NA',
                '% Top catégorie': 'NA',
                'Outliers détectés': outliers
            })
        else:
            # Statistiques catégorielles
            top_counts = data.value_counts().head(1)
            top_category = top_counts.index[0] if not top_counts.empty else None
            top_percentage = float((top_counts.iloc[0] / len(data)) * 100) if not top_counts.empty else None

            col_stats.update({
                'Moyenne': 'NA',
                'Médiane': 'NA',
                'Min': 'NA',
                'Max': 'NA',
                'Écart-type': 'NA',
                'Variance': 'NA',
                'Q1': 'NA',
                'Q3': 'NA',
                'IQR': 'NA',
                'Skewness': 'NA',
                'Kurtosis': 'NA',
                'Fréquence top 5 catégories': top_counts.to_dict() if not top_counts.empty else {},
                '% Top catégorie': top_percentage,
                'Outliers détectés': 'NA'
            })

        stats.append(col_stats)

    response = {
        'shape': {'rows': df.shape[0], 'columns': df.shape[1]},
        'stats': stats
    }

    return JsonResponse(response)
