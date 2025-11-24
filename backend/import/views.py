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
                    # Lire le contenu XML
                    file_content = file.read().decode('utf-8')
                    print(f"Contenu XML (premiers 500 caractères): {file_content[:500]}")
                    
                    # Parser manuellement le XML
                    import xml.etree.ElementTree as ET
                    root = ET.fromstring(file_content)
                    
                    # Extraire toutes les données dans une liste de dictionnaires
                    data_list = []
                    for element in root:
                        row_data = {}
                        for child in element:
                            row_data[child.tag] = child.text
                        data_list.append(row_data)
                    
                    print(f"Nombre d'éléments parsés: {len(data_list)}")
                    print(f"Exemple de données: {data_list[0] if data_list else 'Aucune'}")
                    
                    df = pd.DataFrame(data_list)
                        
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

        # Ajout du préfixe pour éviter collisions
        df = df.add_prefix(f"{prefix}.")
        return df

    # Stocker les préfixes
    file_prefix = {}
    for rel in data:
        for fichier in [rel["fichier1"], rel["fichier2"]]:
            if fichier not in dfs:
                path = os.path.join(user_folder, fichier)
                prefix = os.path.splitext(fichier)[0]
                dfs[fichier] = read_file(path, prefix)
                file_prefix[fichier] = prefix

    # 3️⃣ Trouver le pivot (fichier le plus lié)
    file_counts = Counter()
    for rel in data:
        file_counts[rel["fichier1"]] += 1
        file_counts[rel["fichier2"]] += 1

    pivot_file = file_counts.most_common(1)[0][0]
    merged_df = dfs[pivot_file]

    # 4️⃣ Merge intelligent
    def merge_relation(df_left, df_right, left_on, right_on):
        common_cols = set(df_left.columns).intersection(df_right.columns) - {left_on, right_on}
        if common_cols:
            df_right = df_right.rename(columns={c: f"{c}_from_merge" for c in common_cols})
        return pd.merge(df_left, df_right, left_on=left_on, right_on=right_on, how='outer')

    # 5️⃣ MERGE selon relations
    for rel in data:
        left_file = rel["fichier1"]
        right_file = rel["fichier2"]

        left_col_name = rel['colonne1'].strip().replace('\ufeff','')
        right_col_name = rel['colonne2'].strip().replace('\ufeff','')

        left_col = f"{file_prefix[left_file]}.{left_col_name}"
        right_col = f"{file_prefix[right_file]}.{right_col_name}"

        if left_file == pivot_file:
            merged_df = merge_relation(merged_df, dfs[right_file], left_col, right_col)
        elif right_file == pivot_file:
            merged_df = merge_relation(merged_df, dfs[left_file], right_col, left_col)
        else:
            merged_df = merge_relation(merged_df, dfs[left_file], left_col, right_col)

    # 🔥🔥🔥 5️⃣bis — SUPPRESSION DES COLONNES DE JOINTURE (ID) 🔥🔥🔥
    cols_to_remove = []

    for rel in data:
        col1 = rel["colonne1"].strip().replace('\ufeff', '')
        col2 = rel["colonne2"].strip().replace('\ufeff', '')

        file1 = rel["fichier1"]
        file2 = rel["fichier2"]

        prefix1 = file_prefix[file1]
        prefix2 = file_prefix[file2]

        cols_to_remove.append(f"{prefix1}.{col1}")
        cols_to_remove.append(f"{prefix2}.{col2}")

    # On retire uniquement celles présentes
    cols_to_remove = [c for c in cols_to_remove if c in merged_df.columns]

    merged_df = merged_df.drop(columns=cols_to_remove, errors="ignore")
    # 🔥🔥🔥 FIN DE L'AJOUT 🔥🔥🔥

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
    Crée des relations basées sur la similarité des noms de colonnes
    """
    import os
    import pandas as pd
    import json
    import re
    from django.conf import settings

    user = request.user
    folder = os.path.join(settings.MEDIA_ROOT, user.username, folder_name)

    if not os.path.isdir(folder):
        return Response({"detail": "Dossier introuvable."}, status=404)

    ALLOWED_EXT = {'.csv', '.xlsx', '.xls'}

    def load_tabular(filepath):
        ext = os.path.splitext(filepath)[1].lower()
        try:
            if ext == '.csv':
                return pd.read_csv(filepath, nrows=1, dtype=str, low_memory=False)  # Juste les headers
            elif ext in ('.xlsx', '.xls'):
                return pd.read_excel(filepath, nrows=1, dtype=str)
        except Exception:
            return None
        return None

    def normalize_column_name(col_name):
        """Normalise le nom de colonne pour la comparaison"""
        if pd.isna(col_name):
            return ""
        
        col = str(col_name).strip().lower()
        
        # Supprimer les caractères spéciaux, garder seulement lettres, chiffres et underscore
        col = re.sub(r'[^a-z0-9_]', '', col)
        
        # Séparer par underscore et trier les parties pour standardiser l'ordre
        parts = [part for part in col.split('_') if part]  # Supprimer les parties vides
        
        if len(parts) > 1:
            # Trier les parties alphabétiquement pour que "client_id" et "id_client" deviennent identiques
            return '_'.join(sorted(parts))
        elif parts:
            return parts[0]
        else:
            return ""

    def are_columns_similar(col1, col2):
        """Vérifie si deux colonnes normalisées sont similaires"""
        norm1 = normalize_column_name(col1)
        norm2 = normalize_column_name(col2)
        
        if not norm1 or not norm2:
            return False
            
        # Exact match après normalisation
        if norm1 == norm2:
            return True
            
        # Vérifier la similarité avec un seuil (pour gérer les petites différences)
        # Par exemple: "customer_id" vs "client_id"
        from difflib import SequenceMatcher
        similarity = SequenceMatcher(None, norm1, norm2).ratio()
        return similarity > 0.8  # 80% de similarité

    # 1) Lister les fichiers et récupérer les colonnes
    files_columns = {}
    for fname in os.listdir(folder):
        path = os.path.join(folder, fname)
        if not os.path.isfile(path):
            continue
        ext = os.path.splitext(fname)[1].lower()
        if ext in ALLOWED_EXT:
            df = load_tabular(path)
            if df is not None:
                df.columns = [str(c) for c in df.columns]
                files_columns[fname] = df.columns.tolist()

    # 2) Trouver les colonnes similaires entre fichiers
    relations = []
    processed_pairs = set()
    
    file_names = list(files_columns.keys())
    
    for i in range(len(file_names)):
        for j in range(i + 1, len(file_names)):
            f1 = file_names[i]
            f2 = file_names[j]
            
            for col1 in files_columns[f1]:
                for col2 in files_columns[f2]:
                    # Créer un identifiant unique pour cette paire
                    pair_id = tuple(sorted([(f1, col1), (f2, col2)]))
                    
                    if pair_id in processed_pairs:
                        continue
                    
                    if are_columns_similar(col1, col2):
                        relations.append({
                            "fichier1": f1,
                            "colonne1": col1,
                            "fichier2": f2,
                            "colonne2": col2,
                            "confidence": 1.0
                        })
                        processed_pairs.add(pair_id)

    # 3) Sauvegarder dans le dossier analyse
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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def data_preview(request, folder_name):
    user_folder = os.path.join(settings.MEDIA_ROOT, request.user.username, folder_name)
    analyse_folder = os.path.join(user_folder, "analyse")
    
    # Chercher le fichier combiné ou le premier fichier
    combined_file = os.path.join(analyse_folder, "file_combined.csv")
    
    if os.path.exists(combined_file):
        file_path = combined_file
    else:
        # Prendre le premier fichier CSV du dossier
        files = [f for f in os.listdir(user_folder) if f.endswith('.csv')]
        if not files:
            return Response({"preview": []}, status=200)
        file_path = os.path.join(user_folder, files[0])
    
    try:
        df = pd.read_csv(file_path)
        # Prendre seulement les 10 premières lignes pour l'aperçu
        preview = df.head(50).fillna('').to_dict('records')
        return Response({"preview": preview}, status=200)
    except Exception as e:
        return Response({"error": str(e)}, status=500)