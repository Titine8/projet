import os
import shutil
import json  # ✅ important pour save_relations
from django.conf import settings
from django.core.files.storage import default_storage
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes  # ✅ pour save_relations
import pandas as pd

# ---------------- Upload et liste des dossiers ----------------
import os
import pandas as pd
from django.conf import settings
from django.core.files.storage import default_storage
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

class FileUploadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        user_folder = os.path.join(settings.MEDIA_ROOT, user.username)

        if not os.path.exists(user_folder):
            return Response({"folders": []}, status=status.HTTP_200_OK)

        try:
            folders = [
                name for name in os.listdir(user_folder)
                if os.path.isdir(os.path.join(user_folder, name))
            ]
        except Exception:
            folders = []

        return Response({"folders": folders}, status=status.HTTP_200_OK)

    def post(self, request):
        print("=== DÉBUT UPLOAD ===")
        print("User:", request.user)
        print("Nombre de fichiers:", len(request.FILES.getlist("files")))
        print("Dossier:", request.POST.get("subfolder", ""))
        
        user = request.user
        files = request.FILES.getlist("files")
        subfolder_name = request.POST.get("subfolder", "").strip()

        for file in files:
            print(f"Fichier: {file.name} - Taille: {file.size} bytes")

        if not files:
            print("ERREUR: Aucun fichier")
            return Response({"error": "Aucun fichier envoyé."}, status=status.HTTP_400_BAD_REQUEST)
        
        if not subfolder_name:
            print("ERREUR: Pas de nom de dossier")
            return Response({"error": "Nom du dossier requis."}, status=status.HTTP_400_BAD_REQUEST)

        allowed_extensions = ['.csv', '.xlsx', '.xls', '.json', '.xml']
        final_path = os.path.join(settings.MEDIA_ROOT, user.username, subfolder_name)
        os.makedirs(final_path, exist_ok=True)

        for file in files:
            ext = os.path.splitext(file.name)[1].lower()
            print(f"Traitement: {file.name}, extension: {ext}")
            
            if ext not in allowed_extensions:
                print(f"ERREUR: Extension non autorisée: {ext}")
                return Response({"error": f"Extension non autorisée: {ext}"}, status=status.HTTP_400_BAD_REQUEST)

            try:
                print(f"Conversion de {file.name}...")
                
                if ext == '.csv':
                    df = pd.read_csv(file)
                elif ext in ['.xlsx', '.xls']:
                    df = pd.read_excel(file)
                elif ext == '.json':
                    # Lire le contenu JSON
                    file_content = file.read().decode('utf-8')
                    print(f"Contenu JSON (premiers 500 caractères): {file_content[:500]}")
                    
                    import json
                    data = json.loads(file_content)
                    print(f"Type des données JSON: {type(data)}")
                    print(f"Clés du JSON: {list(data.keys()) if isinstance(data, dict) else 'N/A'}")
                    
                    # Gérer la structure {"employees": [array]}
                    if isinstance(data, dict):
                        # Chercher le premier tableau dans le dictionnaire
                        for key, value in data.items():
                            if isinstance(value, list):
                                print(f"Tableau trouvé dans la clé: {key}")
                                df = pd.DataFrame(value)
                                break
                        else:
                            # Si pas de tableau, créer un DataFrame avec le dict
                            df = pd.DataFrame([data])
                    elif isinstance(data, list):
                        df = pd.DataFrame(data)
                    else:
                        df = pd.DataFrame([data])
                        
                elif ext == '.xml':
                    # Utiliser le parser etree au lieu de lxml
                    df = pd.read_xml(file, parser='etree')
                        
                print(f"DataFrame shape: {df.shape}")
                print(f"Colonnes: {df.columns.tolist()}")
                print(f"Premières lignes: {df.head(2)}")
                
                if len(df) > 5000:
                    df = df.head(5000)
                    print(f"Limité à 5000 lignes")
                
                csv_filename = os.path.splitext(file.name)[0] + '.csv'
                csv_path = os.path.join(final_path, csv_filename)
                df.to_csv(csv_path, index=False)
                print(f"✓ Converti en: {csv_filename}")
                
            except Exception as e:
                print(f"ERREUR: {str(e)}")
                import traceback
                print(f"Traceback: {traceback.format_exc()}")
                return Response({"error": f"Erreur conversion {file.name}: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        print("=== UPLOAD RÉUSSI ===")
        return Response({"message": "Fichiers convertis en CSV avec succès."}, status=status.HTTP_200_OK)


# ---------------- Supprimer un dossier ----------------
class FolderDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, folder_name):
        user = request.user
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

# ---------------- Lister les fichiers d’un dossier ----------------
class FolderFilesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, folder_name):
        user = request.user
        folder_name = os.path.normpath(folder_name)
        if folder_name.startswith("..") or os.path.isabs(folder_name):
            return Response({"error": "Nom de dossier invalide."}, status=status.HTTP_400_BAD_REQUEST)

        folder_path = os.path.join(settings.MEDIA_ROOT, user.username, folder_name)
        if not os.path.exists(folder_path):
            return Response({"files": []}, status=status.HTTP_200_OK)

        files = [
            f for f in os.listdir(folder_path)
            if os.path.isfile(os.path.join(folder_path, f))
        ]
        return Response({"files": files}, status=status.HTTP_200_OK)

# ---------------- Supprimer un fichier ----------------
class FileDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, folder_name, file_name):
        user = request.user
        folder_name = os.path.normpath(folder_name)
        file_name = os.path.normpath(file_name)

        if folder_name.startswith("..") or os.path.isabs(folder_name):
            return Response({"error": "Nom de dossier invalide."}, status=status.HTTP_400_BAD_REQUEST)
        if file_name.startswith("..") or os.path.isabs(file_name):
            return Response({"error": "Nom de fichier invalide."}, status=status.HTTP_400_BAD_REQUEST)

        file_path = os.path.join(settings.MEDIA_ROOT, user.username, folder_name, file_name)
        if not os.path.exists(file_path):
            return Response({"error": "Fichier non trouvé."}, status=status.HTTP_404_NOT_FOUND)

        try:
            os.remove(file_path)
        except Exception as e:
            return Response({"error": f"Erreur lors de la suppression: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({"message": "Fichier supprimé avec succès."}, status=status.HTTP_200_OK)

# ---------------- Colonnes d'un fichier ----------------
# ---------------- Colonnes d'un fichier ----------------
import os
import pandas as pd
import numpy as np
import re
import json
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

TIME_PATTERNS = [
    r'^\d{1,2}:\d{2}$',           # H:M
    r'^\d{1,2}:\d{2}:\d{2}$',     # H:M:S
    r'^\d{1,2}:\d{2}:\d{2}\.\d+$' # H:M:S.ms
]

MONTHS_MAPPING = {
    1: "Janvier", 2: "Février", 3: "Mars", 4: "Avril",
    5: "Mai", 6: "Juin", 7: "Juillet", 8: "Août",
    9: "Septembre", 10: "Octobre", 11: "Novembre", 12: "Décembre"
}

def is_time_series(series):
    series_non_null = series.dropna().astype(str)
    if series_non_null.empty:
        return False
    match_count = sum(1 for val in series_non_null if any(re.match(pattern, val) for pattern in TIME_PATTERNS))
    return match_count / len(series_non_null) > 0.7

def dissect_date_column(df, col_name):
    date_col = pd.to_datetime(df[col_name], errors='coerce')
    df[f'{col_name}_jour'] = date_col.dt.day
    df[f'{col_name}_mois'] = date_col.dt.month.map(MONTHS_MAPPING)
    df[f'{col_name}_annee'] = date_col.dt.year
    df.drop(columns=[col_name], inplace=True)
    return [f'{col_name}_jour', f'{col_name}_mois', f'{col_name}_annee']

def dissect_time_column(df, col_name):
    time_col = pd.to_datetime(df[col_name], errors='coerce').dt.time
    df[f'{col_name}_heure'] = time_col.apply(lambda x: x.hour if pd.notna(x) else np.nan)
    df[f'{col_name}_minute'] = time_col.apply(lambda x: x.minute if pd.notna(x) else np.nan)
    df[f'{col_name}_seconde'] = time_col.apply(lambda x: x.second if pd.notna(x) else np.nan)
    df.drop(columns=[col_name], inplace=True)
    return [f'{col_name}_heure', f'{col_name}_minute', f'{col_name}_seconde']

class FileColumnsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, folder_name, file_name):
        user = request.user
        folder_name = os.path.normpath(folder_name)
        file_name = os.path.normpath(file_name)

        if folder_name.startswith("..") or os.path.isabs(folder_name):
            return Response({"error": "Nom de dossier invalide."}, status=status.HTTP_400_BAD_REQUEST)
        if file_name.startswith("..") or os.path.isabs(file_name):
            return Response({"error": "Nom de fichier invalide."}, status=status.HTTP_400_BAD_REQUEST)

        user_folder = os.path.join(settings.MEDIA_ROOT, user.username, folder_name)
        file_path = os.path.join(user_folder, file_name)

        if not os.path.exists(file_path):
            return Response({"error": "Fichier non trouvé."}, status=status.HTTP_404_NOT_FOUND)

        try:
            if file_name.endswith('.csv'):
                df = pd.read_csv(file_path)
            elif file_name.endswith(('.xls', '.xlsx')):
                df = pd.read_excel(file_path)
            else:
                return Response({"error": "Type de fichier non supporté"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        columns_to_process = df.columns.tolist()
        dissected_columns = []

        for col in columns_to_process:
            if col not in df.columns:
                continue

            data = df[col]

            if pd.api.types.is_numeric_dtype(data):
                continue
            elif is_time_series(data):
                new_cols = dissect_time_column(df, col)
                dissected_columns.extend(new_cols)
            else:
                try:
                    temp = pd.to_datetime(data.dropna(), errors='coerce')
                    if temp.notna().sum() / max(1, len(data.dropna())) > 0.7:
                        new_cols = dissect_date_column(df, col)
                        dissected_columns.extend(new_cols)
                except:
                    continue

        # Écraser le fichier avec les nouvelles colonnes
        try:
            if file_name.endswith('.csv'):
                df.to_csv(file_path, index=False, encoding='utf-8')
            elif file_name.endswith(('.xls', '.xlsx')):
                df.to_excel(file_path, index=False)
        except Exception as e:
            return Response({"error": f"Erreur lors de la sauvegarde du fichier: {str(e)}"}, status=500)

        # Retourner les noms des colonnes finales du fichier
        return Response({
            "columns": df.columns.tolist()
        }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_relations(request, folder_name):
    import pandas as pd
    import os, json
    from collections import Counter
    from django.conf import settings

    data = request.data.get("relations", [])
    user_folder = os.path.join(settings.MEDIA_ROOT, request.user.username, folder_name)
    analyse_folder = os.path.join(user_folder, "analyse")
    os.makedirs(analyse_folder, exist_ok=True)

    # 1️⃣ Sauvegarde des relations
    relations_path = os.path.join(analyse_folder, "relations.json")
    with open(relations_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # 2️⃣ Lecture de tous les fichiers dans un dict avec préfixe
    dfs = {}
    def read_file(path, prefix):
        ext = os.path.splitext(path)[1].lower()
        if ext == ".csv":
            try:
                df = pd.read_csv(path, encoding='utf-8')
            except UnicodeDecodeError:
                df = pd.read_csv(path, encoding='cp1252')
        elif ext in [".xlsx", ".xls"]:
            df = pd.read_excel(path)
        else:
            raise ValueError(f"Extension non supportée: {ext}")
        # Nettoyage des colonnes
        df.columns = [c.strip().replace('\ufeff','') for c in df.columns]
        # Ajout du préfixe pour éviter les collisions
        df = df.add_prefix(f"{prefix}.")
        return df

    # Préparer les préfixes des fichiers (sans extension)
    file_prefix = {}
    for rel in data:
        for fichier in [rel["fichier1"], rel["fichier2"]]:
            if fichier not in dfs:
                path = os.path.join(user_folder, fichier)
                prefix = os.path.splitext(fichier)[0]  # ex: client, produit
                dfs[fichier] = read_file(path, prefix)
                file_prefix[fichier] = prefix

    # 3️⃣ Déterminer le pivot central
    file_counts = Counter()
    for rel in data:
        file_counts[rel["fichier1"]] += 1
        file_counts[rel["fichier2"]] += 1
    pivot_file = file_counts.most_common(1)[0][0]
    merged_df = dfs[pivot_file]

    # 4️⃣ Fonction merge intelligente
    def merge_relation(df_left, df_right, left_on, right_on):
        common_cols = set(df_left.columns).intersection(df_right.columns) - {left_on, right_on}
        if common_cols:
            df_right = df_right.rename(columns={c: f"{c}_from_merge" for c in common_cols})
        return pd.merge(df_left, df_right, left_on=left_on, right_on=right_on, how='outer')

    # 5️⃣ Merge tous les fichiers selon les relations
    for rel in data:
        left_file = rel["fichier1"]
        right_file = rel["fichier2"]

        # ⚡ Extraire le nom de colonne avant le f-string pour éviter le backslash
        left_col_name = rel['colonne1'].strip().replace('\ufeff','')
        right_col_name = rel['colonne2'].strip().replace('\ufeff','')

        # Colonnes préfixées pour le merge
        left_col = f"{file_prefix[left_file]}.{left_col_name}"
        right_col = f"{file_prefix[right_file]}.{right_col_name}"

        if left_file == pivot_file:
            merged_df = merge_relation(merged_df, dfs[right_file], left_col, right_col)
        elif right_file == pivot_file:
            merged_df = merge_relation(merged_df, dfs[left_file], right_col, left_col)
        else:
            merged_df = merge_relation(merged_df, dfs[left_file], left_col, right_col)

    # 6️⃣ Sauvegarde du fichier combiné
    combined_file_path = os.path.join(analyse_folder, "file_combined.csv")
    if merged_df is not None:
        merged_df.to_csv(combined_file_path, index=False, encoding='utf-8-sig')

    # 7️⃣ Retourner les colonnes pour React
    columns = merged_df.columns.tolist() if merged_df is not None else []

    return Response({
        "message": "Relations sauvegardées et fichier combiné créé.",
        "combined_file": "file_combined.csv",
        "columns": columns
    }, status=200)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_relations(request, folder_name):
    user = request.user
    analyse_folder = os.path.join(settings.MEDIA_ROOT, user.username, folder_name, "analyse")
    file_path = os.path.join(analyse_folder, "relations.json")
    
    if not os.path.exists(file_path):
        return Response({"relations": []}, status=200)
    
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return Response({"relations": data}, status=200)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_cible(request, folder_name):
    cible = request.data.get("cible")
    analyse_folder = os.path.join(settings.MEDIA_ROOT, request.user.username, folder_name, "analyse")
    os.makedirs(analyse_folder, exist_ok=True)
    cible_path = os.path.join(analyse_folder, "cible.json")
    with open(cible_path, "w", encoding="utf-8") as f:
        json.dump({"cible": cible}, f, ensure_ascii=False, indent=2)
    return Response({"message": "Cible sauvegardée"}, status=200)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_relations_file(request, folder_name):
    """
    Vérifie si le fichier relations.json existe dans le dossier analyse
    Renvoie :
      - {"exists": True, "relations": [...]} si le fichier existe
      - {"exists": False} si le fichier n'existe pas
    """
    user = request.user
    analyse_folder = os.path.join(settings.MEDIA_ROOT, user.username, folder_name, "analyse")
    file_path = os.path.join(analyse_folder, "relations.json")
    
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return Response({"exists": True, "relations": data}, status=200)
    
    return Response({"exists": False}, status=200)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_relation(request, folder_name):
    """
    Analyse les fichiers d’un dossier utilisateur et retourne les relations détectées
    entre colonnes de différents fichiers sous forme JSON.
    """
    import os
    import re
    import unicodedata
    import pandas as pd
    from django.conf import settings

    user = request.user
    folder = os.path.join(settings.MEDIA_ROOT, user.username, folder_name)

    if not os.path.isdir(folder):
        return Response({"detail": "Dossier introuvable."}, status=404)

    # --- paramètres de l’algorithme ---
    ALLOWED_EXT = {'.csv', '.xlsx', '.xls'}
    SAMPLE_N_ROWS = 200000
    UNIQUE_VALUES_CAP = 20000
    THRESHOLD = 0.65
    MIN_NON_NULL_RATIO = 0.01
    _rx_non_alnum = re.compile(r'[^0-9A-Za-z]+')

    def normalize_value(v):
        if pd.isna(v):
            return None
        s = str(v).strip()
        if s == '':
            return None
        s = unicodedata.normalize('NFKD', s)
        s = s.lower()
        s = _rx_non_alnum.sub('', s)
        return s if s else None

    def load_tabular(filepath):
        ext = os.path.splitext(filepath)[1].lower()
        try:
            if ext == '.csv':
                return pd.read_csv(filepath, nrows=SAMPLE_N_ROWS, dtype=str, low_memory=False)
            elif ext in ('.xlsx', '.xls'):
                return pd.read_excel(filepath, nrows=SAMPLE_N_ROWS, dtype=str)
        except Exception:
            return None
        return None

    def extract_column_values(df, col):
        total = len(df)
        if total == 0:
            return set(), 0, 0
        series = df[col]
        non_null = 0
        values = set()
        for val in series:
            nv = normalize_value(val)
            if nv is None:
                continue
            non_null += 1
            if len(values) < UNIQUE_VALUES_CAP:
                values.add(nv)
        return values, non_null, total

    # 1) lister fichiers
    files = []
    for fname in os.listdir(folder):
        path = os.path.join(folder, fname)
        if not os.path.isfile(path):
            continue
        ext = os.path.splitext(fname)[1].lower()
        if ext in ALLOWED_EXT:
            files.append((fname, path))

    if not files:
        return Response([], status=200)

    # 2) extraire colonnes et valeurs
    metadata = {}
    for fname, path in files:
        df = load_tabular(path)
        if df is None:
            continue
        df.columns = [str(c) for c in df.columns]
        metadata[fname] = {"cols": {}}
        for col in df.columns:
            vals, non_null, total = extract_column_values(df, col)
            if total == 0 or (non_null / max(total, 1)) < MIN_NON_NULL_RATIO:
                continue
            metadata[fname]['cols'][col] = {"values": vals}

    # 3) comparer colonnes (éviter les doublons)
    relations = []
    file_names = list(metadata.keys())
    for i, f1 in enumerate(file_names):
        for j in range(i + 1, len(file_names)):  # ne compare que f1 avec les fichiers suivants
            f2 = file_names[j]
            for c1, info1 in metadata[f1]['cols'].items():
                vals1 = info1['values']
                if not vals1:
                    continue
                for c2, info2 in metadata[f2]['cols'].items():
                    vals2 = info2['values']
                    if not vals2:
                        continue
                    inter = vals1.intersection(vals2)
                    prop1 = len(inter) / len(vals1) if vals1 else 0
                    prop2 = len(inter) / len(vals2) if vals2 else 0
                    if prop1 >= THRESHOLD or prop2 >= THRESHOLD:
                        relations.append({
                            "fichier1": f1,
                            "colonne1": c1,
                            "fichier2": f2,
                            "colonne2": c2
                        })


    # 4) créer le dossier 'analyse' si nécessaire et sauvegarder le JSON
    analyse_folder = os.path.join(folder, 'analyse')
    os.makedirs(analyse_folder, exist_ok=True)
    json_path = os.path.join(analyse_folder, 'relations.json')
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(relations, f, ensure_ascii=False, indent=4)

    return Response(relations, status=200)




@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_cible(request, folder_name):
    analyse_folder = os.path.join(settings.MEDIA_ROOT, request.user.username, folder_name, "analyse")
    cible_path = os.path.join(analyse_folder, "cible.json")
    
    if not os.path.exists(cible_path):
        return Response({"cible": None}, status=200)
    
    with open(cible_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return Response({"cible": data.get("cible")}, status=200)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def prepare_single_combined(request, folder_name):

    
    user_folder = os.path.join(settings.MEDIA_ROOT, request.user.username, folder_name)
    analyse_folder = os.path.join(user_folder, "analyse")
    os.makedirs(analyse_folder, exist_ok=True)

    # On récupère le seul fichier présent dans le dossier
    files = [f for f in os.listdir(user_folder) if os.path.isfile(os.path.join(user_folder, f))]
    if not files:
        return Response({"error": "Aucun fichier trouvé dans le dossier."}, status=400)

    source_file = os.path.join(user_folder, files[0])
    combined_file_path = os.path.join(analyse_folder, "file_combined.csv")

    # On copie/renomme le fichier dans analyse
    shutil.copy2(source_file, combined_file_path)

    return Response({
        "message": "Fichier renommé et sauvegardé sous file_combined.csv",
        "combined_file": "file_combined.csv"
    }, status=200)