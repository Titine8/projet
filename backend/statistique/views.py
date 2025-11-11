import os
import requests
import numpy as np
from django.conf import settings
from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from scipy.stats import skew, kurtosis
import pandas as pd
from dotenv import load_dotenv
import json



load_dotenv()  # charge les variables d'environnement depuis .env

HF_TOKEN = os.getenv("HF_TOKEN")


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_files(request):
    username = request.GET.get("username")
    folder = request.GET.get("folder")

    if not username or not folder:
        return JsonResponse({"error": "username et folder sont requis"}, status=400)

    user_folder_path = os.path.join(settings.MEDIA_ROOT, username, folder,"analyse")

    if not os.path.exists(user_folder_path):
        return JsonResponse({"files": []})

    files = [
        f for f in os.listdir(user_folder_path)
        if os.path.isfile(os.path.join(user_folder_path, f))
    ]
    return JsonResponse({"files": files})


import pandas as pd
import numpy as np
import os
import json
import re
from scipy.stats import skew, kurtosis
from django.http import JsonResponse
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

TIME_PATTERNS = [
    r'^\d{1,2}:\d{2}$',           # H:M
    r'^\d{1,2}:\d{2}:\d{2}$',     # H:M:S
    r'^\d{1,2}:\d{2}:\d{2}\.\d+$' # H:M:S.ms
]

# Mapping des mois
MONTHS_MAPPING = {
    1: "Janvier", 2: "Février", 3: "Mars", 4: "Avril",
    5: "Mai", 6: "Juin", 7: "Juillet", 8: "Août",
    9: "Septembre", 10: "Octobre", 11: "Novembre", 12: "Décembre"
}

def is_time_series(series):
    series_non_null = series.dropna().astype(str)
    if series_non_null.empty:
        return False
    match_count = 0
    for val in series_non_null:
        if any(re.match(pattern, val) for pattern in TIME_PATTERNS):
            match_count += 1
    return match_count / len(series_non_null) > 0.7  # 70% correspondances

def dissect_date_column(df, col_name):
    """Dissèque une colonne date en jour, mois (texte), année et supprime la colonne parente"""
    date_col = pd.to_datetime(df[col_name], errors='coerce')
    
    # Créer les nouvelles colonnes
    df[f'{col_name}_jour'] = date_col.dt.day
    df[f'{col_name}_mois'] = date_col.dt.month.map(MONTHS_MAPPING)  # Mois en texte directement
    df[f'{col_name}_annee'] = date_col.dt.year
    
    # Supprimer la colonne parente
    df.drop(columns=[col_name], inplace=True)
    
    return [f'{col_name}_jour', f'{col_name}_mois', f'{col_name}_annee']

def dissect_time_column(df, col_name):
    """Dissèque une colonne time en heure, minute, seconde et supprime la colonne parente"""
    time_col = pd.to_datetime(df[col_name], errors='coerce').dt.time
    
    # Créer les nouvelles colonnes
    df[f'{col_name}_heure'] = time_col.apply(lambda x: x.hour if pd.notna(x) else np.nan)
    df[f'{col_name}_minute'] = time_col.apply(lambda x: x.minute if pd.notna(x) else np.nan)
    df[f'{col_name}_seconde'] = time_col.apply(lambda x: x.second if pd.notna(x) else np.nan)
    
    # Supprimer la colonne parente
    df.drop(columns=[col_name], inplace=True)
    
    return [f'{col_name}_heure', f'{col_name}_minute', f'{col_name}_seconde']

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def descriptive_stats(request, username, folder, filename):
    user_folder = os.path.join(settings.MEDIA_ROOT, username, folder, "analyse")
    file_path = os.path.join(user_folder, filename)

    if not os.path.exists(file_path):
        return JsonResponse({'error': 'Fichier non trouvé'}, status=404)

    # Chemin du JSON
    output_file = os.path.join(user_folder, "statistique_descriptive.json")

    # Si le JSON existe déjà, on le lit et on retourne directement
    if os.path.exists(output_file):
        try:
            with open(output_file, "r", encoding="utf-8") as f:
                stats = json.load(f)
            return JsonResponse({
                "message": "Statistiques existantes utilisées",
                "file": output_file,
                "stats_existantes": True
            })
        except Exception as e:
            return JsonResponse({'error': f'Erreur lecture JSON existant: {str(e)}'}, status=500)

    # Lire le fichier CSV ou Excel
    try:
        if filename.endswith('.csv'):
            df = pd.read_csv(file_path)
        elif filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(file_path)
        else:
            return JsonResponse({'error': 'Type de fichier non supporté'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

    columns_to_process = df.columns.tolist()
    dissected_columns = []
    parent_columns_to_remove = []

    # Détection et dissection des colonnes date et time
    for col in columns_to_process:
        if col not in df.columns:
            continue
        data = df[col]

        # Détection type améliorée
        if pd.api.types.is_numeric_dtype(data):
            continue
        elif is_time_series(data):
            new_cols = dissect_time_column(df, col)
            dissected_columns.extend(new_cols)
            parent_columns_to_remove.append(col)
        else:
            try:
                temp = pd.to_datetime(data.dropna(), errors='coerce')
                if temp.notna().sum() / max(1, len(data.dropna())) > 0.7:
                    new_cols = dissect_date_column(df, col)
                    dissected_columns.extend(new_cols)
                    parent_columns_to_remove.append(col)
            except:
                continue

    stats = []

    # Fonction pour générer les statistiques pour une colonne
    def generate_column_stats(col, data):
        nb_manquantes = int(data.isna().sum())
        nb_non_manquantes = int(data.count())

        if pd.api.types.is_numeric_dtype(data):
            type_col = "num"
        elif col.endswith('_mois') or (data.dtype == 'object' and data.nunique() < len(data) * 0.5):
            type_col = "cat"
        else:
            type_col = "cat"

        record = {
            "username": username,
            "folder": folder,
            "nom_colonne": col,
            "est_colonne_dissequee": col in dissected_columns,
            "nb_valeurs_manquantes": nb_manquantes,
            "nb_valeurs_non_manquantes": nb_non_manquantes,
            "type_colonne": type_col,
            "min_val": "N/A",
            "max_val": "N/A",
            "moyenne": "N/A",
            "mediane": "N/A",
            "mode_val": "N/A",
            "ecart_type": "N/A",
            "variance": "N/A",
            "skewness": "N/A",
            "kurtosis": "N/A",
            "etendue": "N/A",
            "total": "N/A",
            "quartile": "N/A",
            "distribution": "N/A",
            "nb_categories_uniques": "N/A",
            "frequence": "N/A",
        }

        if type_col == "num":
            clean = data.dropna()
            if not clean.empty:
                distribution = clean.value_counts(bins=10)
                distribution_dict = {str(k): int(v) for k, v in distribution.items()}
                record.update({
                    "min_val": float(clean.min()),
                    "max_val": float(clean.max()),
                    "moyenne": float(clean.mean()),
                    "mediane": float(clean.median()),
                    "mode_val": str(clean.mode().iloc[0]) if not clean.mode().empty else "N/A",
                    "ecart_type": float(clean.std()),
                    "variance": float(clean.var()),
                    "skewness": float(skew(clean)) if len(clean) > 2 else "N/A",
                    "kurtosis": float(kurtosis(clean)) if len(clean) > 3 else "N/A",
                    "etendue": float(clean.max() - clean.min()),
                    "total": float(clean.sum()),
                    "quartile": {
                        "Q1": float(clean.quantile(0.25)),
                        "Q2": float(clean.quantile(0.5)),
                        "Q3": float(clean.quantile(0.75))
                    },
                    "distribution": distribution_dict
                })
        elif type_col == "cat":
            top_counts = data.value_counts(normalize=True).round(3) * 100
            # Limiter aux 8 premières catégories pour le front
            top_counts_limited = dict(list(top_counts.head(5).items()))
            record.update({
                "nb_categories_uniques": int(data.nunique()),
                "mode_val": str(data.mode().iloc[0]) if not data.mode().empty else "N/A",
                "frequence": top_counts_limited  # ← Seulement les 8 premiers pour le front
            })

        return record

    # Générer stats pour toutes les colonnes
    for col in df.columns:
        stats.append(generate_column_stats(col, df[col]))

    # Sauvegarde du fichier modifié
    try:
        if filename.endswith('.csv'):
            df.to_csv(file_path, index=False, encoding='utf-8')
        elif filename.endswith(('.xls', '.xlsx')):
            df.to_excel(file_path, index=False)
    except Exception as e:
        return JsonResponse({'error': f'Erreur lors de la sauvegarde du fichier: {str(e)}'}, status=500)

    # Sauvegarde JSON
    try:
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(stats, f, ensure_ascii=False, indent=4)
    except Exception as e:
        return JsonResponse({'error': f'Erreur lors de la sauvegarde du JSON: {str(e)}'}, status=500)
        # Création d'un fichier texte avec les stats en phrases

    import scipy.stats as stats_scipy
    import itertools
    import numpy as np

    # --- 1. Valeurs manquantes par colonne ---
    missing_file = os.path.join(user_folder, "missing_values.txt")
    try:
        with open(missing_file, "w", encoding="utf-8") as f_missing:
            total_missing = df.isna().sum().sum()
            f_missing.write(f"Total valeurs manquantes dans le dataset : {total_missing}\n\n")
            for col in df.columns:
                nb_missing = df[col].isna().sum()
                pct_missing = round(nb_missing / len(df) * 100, 2)
                f_missing.write(f"- Colonne '{col}': {nb_missing} valeurs manquantes ({pct_missing}%)\n")
    except Exception as e:
        return JsonResponse({'error': f'Erreur lors de la sauvegarde de missing_values.txt : {str(e)}'}, status=500)

    # --- 2. Distribution globale du dataset ---
    distribution_file = os.path.join(user_folder, "global_distribution.txt")
    try:
        with open(distribution_file, "w", encoding="utf-8") as f_dist:
            f_dist.write(f"Résumé global du dataset :\n")
            f_dist.write(f"- Nombre de lignes : {len(df)}\n")
            f_dist.write(f"- Nombre de colonnes : {len(df.columns)}\n")
            f_dist.write(f"- Types de colonnes :\n")
            for col in df.columns:
                f_dist.write(f"  * {col}: {df[col].dtype}, valeurs uniques : {df[col].nunique()}\n")
    except Exception as e:
        return JsonResponse({'error': f'Erreur lors de la sauvegarde de global_distribution.txt : {str(e)}'}, status=500)

    # --- 3. Relations catégorielles (matrices de contingence) ---
    cat_cols = [c for c in df.columns if df[c].dtype == 'object' or df[c].nunique() < len(df)*0.5]
    cat_relation_file = os.path.join(user_folder, "categorical_relations.txt")
    try:
        with open(cat_relation_file, "w", encoding="utf-8") as f_catrel:
            for col1, col2 in itertools.combinations(cat_cols, 2):
                f_catrel.write(f"Contingence entre '{col1}' et '{col2}':\n")
                contingency = pd.crosstab(df[col1], df[col2])
                f_catrel.write(contingency.to_string())
                f_catrel.write("\n\n")
    except Exception as e:
        return JsonResponse({'error': f'Erreur lors de la sauvegarde de categorical_relations.txt : {str(e)}'}, status=500)

    # --- 4. Correlations avancées numériques/catégorielles (Cramér’s V) ---
    def cramers_v(x, y):
        confusion_matrix = pd.crosstab(x, y)
        chi2 = stats_scipy.chi2_contingency(confusion_matrix)[0]
        n = confusion_matrix.sum().sum()
        phi2 = chi2/n
        r,k = confusion_matrix.shape
        phi2corr = max(0, phi2 - ((k-1)*(r-1))/(n-1))
        rcorr = r - ((r-1)**2)/(n-1)
        kcorr = k - ((k-1)**2)/(n-1)
        return np.sqrt(phi2corr / min((kcorr-1), (rcorr-1))) if min((kcorr-1),(rcorr-1)) > 0 else 0

    advanced_corr_file = os.path.join(user_folder, "advanced_correlations.txt")
    try:
        with open(advanced_corr_file, "w", encoding="utf-8") as f_adv:
            num_cols = [c['nom_colonne'] for c in stats if c['type_colonne'] == "num"]
            for num_col in num_cols:
                for cat_col in cat_cols:
                    f_adv.write(f"Cramér's V entre '{num_col}' et '{cat_col}': {round(cramers_v(df[num_col], df[cat_col]), 3)}\n")
    except Exception as e:
        return JsonResponse({'error': f'Erreur lors de la sauvegarde de advanced_correlations.txt : {str(e)}'}, status=500)

    # --- 5. Résumé global du dataset ---
    summary_file = os.path.join(user_folder, "dataset_summary.txt")
    try:
        with open(summary_file, "w", encoding="utf-8") as f_sum:
            f_sum.write(f"Résumé du dataset :\n")
            f_sum.write(f"- Nombre de lignes : {len(df)}\n")
            f_sum.write(f"- Nombre de colonnes : {len(df.columns)}\n")
            f_sum.write(f"- Types de colonnes : {df.dtypes.to_dict()}\n")
            f_sum.write(f"- Valeurs manquantes totales : {df.isna().sum().sum()}\n")
    except Exception as e:
        return JsonResponse({'error': f'Erreur lors de la sauvegarde de dataset_summary.txt : {str(e)}'}, status=500)





    txt_file = os.path.join(user_folder, "statistique_descriptive.txt")
    try:
        with open(txt_file, "w", encoding="utf-8") as f_txt:
            for col_stat in stats:
                f_txt.write(f"Pour la colonne '{col_stat['nom_colonne']}':\n")
                f_txt.write(f"- Type de colonne: {col_stat['type_colonne']}\n")
                f_txt.write(f"- Nombre de valeurs manquantes: {col_stat['nb_valeurs_manquantes']}\n")
                f_txt.write(f"- Nombre de valeurs non manquantes: {col_stat['nb_valeurs_non_manquantes']}\n")

                if col_stat['type_colonne'] == "num":
                    f_txt.write(f"- Minimum: {col_stat['min_val']}\n")
                    f_txt.write(f"- Maximum: {col_stat['max_val']}\n")
                    f_txt.write(f"- Moyenne: {col_stat['moyenne']}\n")
                    f_txt.write(f"- Médiane: {col_stat['mediane']}\n")
                    f_txt.write(f"- Mode: {col_stat['mode_val']}\n")
                    f_txt.write(f"- Écart-type: {col_stat['ecart_type']}\n")
                    f_txt.write(f"- Variance: {col_stat['variance']}\n")
                    f_txt.write(f"- Skewness: {col_stat['skewness']}\n")
                    f_txt.write(f"- Kurtosis: {col_stat['kurtosis']}\n")
                    f_txt.write(f"- Étendue: {col_stat['etendue']}\n")
                    f_txt.write(f"- Total: {col_stat['total']}\n")
                    f_txt.write(f"- Quartiles: {col_stat['quartile']}\n")
                    f_txt.write(f"- Distribution par bins: {col_stat['distribution']}\n")
                else:  # catégorie
                    f_txt.write(f"- Nombre de catégories uniques: {col_stat['nb_categories_uniques']}\n")
                    f_txt.write(f"- Mode: {col_stat['mode_val']}\n")
                    f_txt.write(f"- Fréquences des catégories: {col_stat['frequence']}\n")
                
                f_txt.write("\n")
    except Exception as e:
        return JsonResponse({'error': f'Erreur lors de la sauvegarde du fichier texte: {str(e)}'}, status=500)

        
    # --- Fichier outliers pour les colonnes numériques ---
    outliers_file = os.path.join(user_folder, "outliers.txt")
    try:
        with open(outliers_file, "w", encoding="utf-8") as f_out:
            for col_stat in stats:
                if col_stat['type_colonne'] == "num" and col_stat['ecart_type'] != "N/A":
                    outliers = df[col_stat['nom_colonne']][
                        (df[col_stat['nom_colonne']] - col_stat['moyenne']).abs() > 3 * col_stat['ecart_type']
                    ].tolist()
                    f_out.write(f"Colonne '{col_stat['nom_colonne']}': {len(outliers)} outliers détectés\n")
                    f_out.write(f"Exemples: {outliers[:10]}{'...' if len(outliers) > 10 else ''}\n\n")
    except Exception as e:
        return JsonResponse({'error': f'Erreur lors de la sauvegarde du fichier outliers.txt: {str(e)}'}, status=500)
        

    # --- Fichier top categories pour colonnes catégorielles ---
    # --- Fichier top categories pour colonnes catégorielles ---
    # --- Fichier top categories pour colonnes catégorielles ---
    top_cat_file = os.path.join(user_folder, "top_categories.txt")
    try:
        with open(top_cat_file, "w", encoding="utf-8") as f_cat:
            for col_stat in stats:
                if col_stat['type_colonne'] == "cat":
                    # Ici on prend TOUTES les catégories depuis les données originales
                    col_name = col_stat['nom_colonne']
                    all_frequencies = df[col_name].value_counts(normalize=True).round(3) * 100  # ← Utiliser df[col_name]
                    freq_sorted = dict(sorted(all_frequencies.items(), key=lambda x: x[1], reverse=True))
                    f_cat.write(f"Colonne '{col_name}':\n")
                    for cat, pct in freq_sorted.items():  # ← Toutes les catégories
                        f_cat.write(f"- {cat}: {pct}%\n")
                    f_cat.write("\n")
    except Exception as e:
        return JsonResponse({'error': f'Erreur lors de la sauvegarde du fichier top_categories.txt: {str(e)}'}, status=500)
        
    
    
    
    from sklearn.preprocessing import LabelEncoder, StandardScaler

    # --- Création du fichier encodé ---
    try:
        encoded_file = os.path.join(user_folder, "file_encoded.csv")

        # Séparer colonnes
        categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
        numeric_df = df.select_dtypes(include='number')

        # Encodage
        cat_df = pd.DataFrame()
        le_dict = {}
        for col in categorical_cols:
            le = LabelEncoder()
            cat_df[col] = le.fit_transform(df[col].astype(str))
            le_dict[col] = list(le.classes_)

        # Recombiner
        combined_df = pd.concat([numeric_df, cat_df], axis=1)

        # Standardisation
        scaler = StandardScaler()
        scaled = scaler.fit_transform(combined_df)
        df_encoded = pd.DataFrame(scaled, columns=combined_df.columns)

        # Sauvegarde CSV
        df_encoded.to_csv(encoded_file, index=False)

    except Exception as e:
        return JsonResponse({'error': f'Erreur création file_encoded.csv: {e}'}, status=500)

    from sklearn.preprocessing import LabelEncoder

    # --- Création de analyse.json et analyse.txt ---
    try:
        cible_path = os.path.join(user_folder, "cible.json")
        analyse_json_path = os.path.join(user_folder, "analyse.json")
        analyse_txt_path = os.path.join(user_folder, "analyse.txt")

        if os.path.exists(cible_path):
            with open(cible_path, "r", encoding="utf-8") as f:
                cible_data = json.load(f)
            target_col = cible_data.get("cible")
            if target_col in df.columns:
                # Encodage automatique pour analyse
                categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
                le_dict2 = {}
                for col in categorical_cols:
                    le = LabelEncoder()
                    df[col] = le.fit_transform(df[col].astype(str))
                    le_dict2[col] = list(le.classes_)

                # Calcul des influences
                numeric_df = df.select_dtypes(include='number')
                correlations = numeric_df.corrwith(numeric_df[target_col]).abs() * 100
                correlations = correlations.drop(labels=[target_col], errors="ignore")
                corr_matrix = df.corr().abs() * 100

                # Sauvegarde analyse.txt
                with open(analyse_txt_path, "w", encoding="utf-8") as f_txt:
                    for col1 in corr_matrix.columns:
                        for col2 in corr_matrix.columns:
                            if col1 != col2:
                                influence_pct = round(corr_matrix.loc[col1, col2], 2)
                                f_txt.write(f"La variable '{col1}' influence la variable '{col2}' à hauteur de {influence_pct}%.\n")

                # Préparer analyse.json
                result = []
                for col, val in correlations.sort_values(ascending=False).items():
                    if pd.isna(val):
                        val = 0
                    result.append({"column": col, "influence": round(val, 2)})

                analyse_data = {
                    "target": target_col,
                    "influences": result,
                    "encoding_mapping": le_dict2,
                    "total_columns_analyzed": len(result),
                    "data_shape": {"rows": len(df), "columns": len(df.columns)},
                    "categorical_columns_encoded": categorical_cols
                }

                with open(analyse_json_path, "w", encoding="utf-8") as f_json:
                    json.dump(analyse_data, f_json, indent=4, ensure_ascii=False)

    except Exception as e:
        return JsonResponse({'error': f'Erreur création analyse.json ou analyse.txt: {str(e)}'}, status=500)

    
    return JsonResponse({
        "message": "Statistiques enregistrées dans JSON et fichier mis à jour",
        "file": output_file,
        "colonnes_ajoutees": dissected_columns,
        "colonnes_supprimees": parent_columns_to_remove,
        "total_colonnes_actuelles": len(df.columns),
        "stats_existantes": False
    })


    
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_descriptive_stats(request, username, folder):
    """
    Renvoie le contenu du fichier JSON statistique_descriptive.json
    """
    user_folder = os.path.join(settings.MEDIA_ROOT, username, folder, "analyse")
    json_file = os.path.join(user_folder, "statistique_descriptive.json")

    if not os.path.exists(json_file):
        return JsonResponse({"error": "Fichier statistique non trouvé"}, status=404)

    try:
        with open(json_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        return JsonResponse(data, safe=False)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    
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
