import os
import pandas as pd
from django.conf import settings
from django.http import JsonResponse
from sklearn.preprocessing import LabelEncoder
from rest_framework.decorators import api_view
from rest_framework.response import Response



def encode_all_to_numeric(request):
    username = request.GET.get("username")
    folder = request.GET.get("folder")
    file_name = request.GET.get("file")

    if not username or not folder or not file_name:
        return JsonResponse({"error": "Paramètres manquants"}, status=400)

    user_folder = os.path.join(settings.MEDIA_ROOT, username, folder,"analyse")
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

    user_folder = os.path.join(settings.MEDIA_ROOT, username, folder,"analyse")
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

   

    return JsonResponse({
        "message": "Matrices de corrélation générées",
        "pearson": pearson_corr,
        "columns": list(numeric_df.columns)
    })


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
    analyse_path = os.path.join(user_folder, "analyse.json")
    analyse_txt_path = os.path.join(user_folder, "analyse.txt")

    # Vérification que le fichier CSV existe
    if not os.path.exists(file_path):
        return JsonResponse({"error": "Fichier introuvable"}, status=404)
    try:
        df = pd.read_csv(file_path)
    except Exception as e:
        return JsonResponse({"error": f"Erreur lecture CSV : {str(e)}"}, status=400)

    # Lecture du fichier cible.json
    if not os.path.exists(cible_path):
        return JsonResponse({"error": "Fichier cible.json introuvable"}, status=404)
    try:
        with open(cible_path, "r", encoding="utf-8") as f:
            cible_data = json.load(f)
        target_col = cible_data.get("cible")
    except Exception as e:
        return JsonResponse({"error": f"Erreur lecture cible.json : {str(e)}"}, status=400)

    if not target_col or target_col not in df.columns:
        return JsonResponse({"error": f"La cible '{target_col}' est absente du fichier."}, status=400)

    # Encodage automatique des colonnes non numériques
    categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
    le_dict = {}
    for col in categorical_cols:
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col].astype(str))
        le_dict[col] = list(le.classes_)

    # Calcul automatique des influences
    numeric_df = df.select_dtypes(include='number')
    correlations = numeric_df.corrwith(numeric_df[target_col]).abs() * 100
    correlations = correlations.drop(labels=[target_col], errors="ignore")

    # Préparation du résultat sans réécrire les fichiers
    result = []
    for col, val in correlations.sort_values(ascending=False).items():
        if pd.isna(val):
            val = 0
        result.append({"column": col, "influence": round(val, 2)})

    return JsonResponse({
        "message": "Influence des colonnes calculée automatiquement",
        "target": target_col,
        "influences": result,
        "analyse_file_used": analyse_path,
        "analyse_txt_used": analyse_txt_path
    })

from rest_framework.decorators import api_view
from rest_framework.response import Response
from ollama import Client
import os
from django.conf import settings
# from sentence_transformers import SentenceTransformer
# import faiss
import pickle
import numpy as np

API_KEY = "ef3e42fe30174c56ad0c5324b1361d6c.MsS63RTt2EhQeqDGqv4sp0Qp"

client = Client(
    host="https://ollama.com",
    headers={'Authorization': 'Bearer ' + API_KEY}
)

# embed_model = SentenceTransformer("all-MiniLM-L6-v2")

# def save_index(index, filenames, folder_path):
#     faiss.write_index(index, os.path.join(folder_path, "faiss.index"))
#     with open(os.path.join(folder_path, "filenames.pkl"), "wb") as f:
#         pickle.dump(filenames, f)
#     print("✅ Index FAISS sauvegardé sur disque.")

# def load_index(folder_path):
#     try:
#         index = faiss.read_index(os.path.join(folder_path, "faiss.index"))
#         with open(os.path.join(folder_path, "filenames.pkl"), "rb") as f:
#             filenames = pickle.load(f)
#         print("✅ Index FAISS chargé depuis le disque.")
#         return index, filenames
#     except Exception:
#         print("⚠️ Aucun index FAISS trouvé, reconstruction nécessaire.")
#         return None, None

# def build_faiss_index(doc_texts):
#     print("🔹 Construction de l'index FAISS...")
#     embeddings = embed_model.encode(doc_texts, convert_to_numpy=True)
#     dim = embeddings.shape[1]
#     index = faiss.IndexFlatL2(dim)
#     index.add(embeddings)
#     print(f"🔹 Index construit avec {len(doc_texts)} documents.")
#     return index, embeddings

@api_view(["POST"])
def chatbot(request):
    user_message = request.data.get("message", "")
    username = request.data.get("username")
    folder = request.data.get("folder")

    print(f"\n💬 Nouvelle requête : '{user_message}' de {username}/{folder}")

    if not username or not folder or not user_message:
        return Response({
            "reply": "❌ Paramètres manquants (username, folder ou message)",
            "status": "error"
        })

    analyse_folder = os.path.join(settings.MEDIA_ROOT, username, folder, "analyse")
    if not os.path.exists(analyse_folder):
        return Response({
            "reply": "❌ Dossier analyse introuvable.",
            "status": "error"
        })

    # ===================== OLD CODE FAISS/EMBEDDINGS =====================
    # Lire tous les fichiers .txt
    # doc_texts = []
    # filenames = []
    # for txt_file in os.listdir(analyse_folder):
    #     if txt_file.endswith(".txt"):
    #         path = os.path.join(analyse_folder, txt_file)
    #         try:
    #             with open(path, "r", encoding="utf-8") as f:
    #                 content = f.read()
    #             doc_texts.append(content)
    #             filenames.append(txt_file)
    #             print(f"📄 Fichier chargé : {txt_file} ({len(content)} caractères)")
    #         except Exception as e:
    #             print(f"⚠️ Impossible de lire {txt_file}: {e}")

    # if not doc_texts:
    #     return Response({
    #         "reply": "❌ Aucun fichier texte trouvé pour l'analyse.",
    #         "status": "error"
    #     })

    # # Charger l'index FAISS existant si disponible
    # index, saved_filenames = load_index(analyse_folder)

    # # Reconstruire l'index si nouveaux fichiers ajoutés ou pas d'index
    # if index is None or set(filenames) != set(saved_filenames):
    #     print("⚡ Reconstruction de l'index FAISS...")
    #     index, embeddings = build_faiss_index(doc_texts)
    #     save_index(index, filenames, analyse_folder)
    # else:
    #     print("🔹 Index FAISS existant utilisé.")

    # =====================================================================

    # ===================== NEW LIGHT RAG =====================
    doc_texts = []
    for txt_file in os.listdir(analyse_folder):
        if txt_file.endswith(".txt"):
            path = os.path.join(analyse_folder, txt_file)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    doc_texts.append(f.read())
                print(f"📄 Fichier chargé : {txt_file} ({len(doc_texts[-1])} caractères)")
            except Exception as e:
                print(f"⚠️ Impossible de lire {txt_file}: {e}")

    if not doc_texts:
        return Response({
            "reply": "❌ Aucun fichier texte trouvé pour l'analyse.",
            "status": "error"
        })

    context = "\n\n".join(doc_texts[:10])  # limite à 10 fichiers si beaucoup de texte

    messages = [
        {'role': 'system', 'content': (
            "Tu réponds toujours de façon courte et précise. deux phrases maximum, des phrase courtes et simples. "
            " sache aussi que la personne en face de toi n'est pas un profil technique, parle de facon a ce qu'il comprenne"
            "Utilise le texte fourni comme source pour les questions sur le dataset. "
            "Si il n'y a pas d'information dans le dataset, réponds normalement."
            "ne dis jamais que on t'a aps fournis une informations, contourne la question en disant ce que tu sais"
        )},
        {'role': 'user', 'content': f"{context}\nQuestion : {user_message}"}
    ]

    try:
        response_text = ""
        for part in client.chat('gpt-oss:120b-cloud', messages=messages, stream=True):
            response_text += part['message']['content']

        print(f"✅ Réponse générée : {response_text.strip()}")
        return Response({
            "reply": response_text.strip(),
            "status": "success"
        })

    except Exception as e:
        print(f"❌ Erreur Ollama: {e}")
        return Response({
            "reply": f"Erreur lors de l'appel à Ollama: {str(e)}",
            "status": "error"
        })

def get_columns_list(request):
    username = request.GET.get("username")
    folder = request.GET.get("folder")
    file_name = request.GET.get("file", "file_combined.csv")

    if not username or not folder:
        return JsonResponse({"error": "Paramètres manquants"}, status=400)

    user_folder = os.path.join(settings.MEDIA_ROOT, username, folder, "analyse")
    file_path = os.path.join(user_folder, file_name)

    if not os.path.exists(file_path):
        return JsonResponse({"error": "Fichier introuvable"}, status=404)

    try:
        df = pd.read_csv(file_path)
        columns_info = []
        
        for col in df.columns:
            col_type = str(df[col].dtype)
            sample_values = df[col].dropna().head(5).tolist()
            unique_count = df[col].nunique()
            
            columns_info.append({
                "name": col,
                "type": col_type,
                "sample_values": sample_values,
                "unique_count": unique_count
            })

        return JsonResponse({
            "columns": columns_info,
            "total_columns": len(df.columns),
            "total_rows": len(df)
        })

    except Exception as e:
        return JsonResponse({"error": f"Erreur lecture CSV : {str(e)}"}, status=400)


@api_view(["POST"])
def get_chart_data(request):
    username = request.data.get("username")
    folder = request.data.get("folder")
    selected_columns = request.data.get("columns", [])
    file_name = request.data.get("file", "file_combined.csv")

    if not username or not folder or not selected_columns:
        return Response({"error": "Paramètres manquants"}, status=400)

    user_folder = os.path.join(settings.MEDIA_ROOT, username, folder, "analyse")
    file_path = os.path.join(user_folder, file_name)

    if not os.path.exists(file_path):
        return Response({"error": "Fichier introuvable"}, status=404)

    try:
        df = pd.read_csv(file_path)
        
        # Vérifier que les colonnes sélectionnées existent
        for col in selected_columns:
            if col not in df.columns:
                return Response({"error": f"Colonne '{col}' introuvable"}, status=400)

        # Agrégation des données selon le nombre de colonnes sélectionnées
        if len(selected_columns) == 1:
            # 1 colonne : distribution simple
            col = selected_columns[0]
            if df[col].dtype in ['object', 'category']:
                # Colonne catégorielle : comptage
                aggregated = df[col].value_counts().reset_index()
                aggregated.columns = ['name', 'value']
                chart_data = aggregated.to_dict('records')
            else:
                # Colonne numérique : histogramme avec 10 bins
                import numpy as np
                # Supprimer les valeurs NaN
                clean_data = df[col].dropna()
                if len(clean_data) > 0:
                    # Créer des bins pour l'histogramme
                    hist, bins = np.histogram(clean_data, bins=10)
                    chart_data = []
                    for i in range(len(hist)):
                        chart_data.append({
                            "name": f"{bins[i]:.1f}-{bins[i+1]:.1f}",
                            "value": int(hist[i])
                        })
                else:
                    chart_data = []

        elif len(selected_columns) == 2:
            # 2 colonnes : X vs Y
            x_col, y_col = selected_columns
            
            if df[x_col].dtype in ['object', 'category'] and df[y_col].dtype in ['object', 'category']:
                # DEUX colonnes catégorielles : tableau de contingence (comptage)
                aggregated = df.groupby([x_col, y_col]).size().reset_index(name='count')
                aggregated['name'] = aggregated[x_col].astype(str) + " - " + aggregated[y_col].astype(str)
                aggregated = aggregated.rename(columns={'count': 'value'})
                chart_data = aggregated[['name', 'value']].to_dict('records')
            
            elif df[x_col].dtype in ['object', 'category']:
                # X catégorielle, Y numérique : moyenne par catégorie
                aggregated = df.groupby(x_col)[y_col].mean().reset_index()
                aggregated.columns = ['name', 'value']
                chart_data = aggregated.to_dict('records')
            
            else:
                # Les deux numériques : scatter plot data
                chart_data = df[[x_col, y_col]].dropna().to_dict('records')

        elif len(selected_columns) == 3:
            # 3 colonnes : X, Y, Z avec regroupement
            x_col, y_col, z_col = selected_columns
            
            if df[x_col].dtype in ['object', 'category'] and df[z_col].dtype in ['object', 'category']:
                # X et Z catégorielles, Y numérique : moyenne double groupe
                aggregated = df.groupby([x_col, z_col])[y_col].mean().reset_index()
                chart_data = aggregated.to_dict('records')
            else:
                # Autres cas : on prend les premières lignes
                chart_data = df[selected_columns].head(50).to_dict('records')

        else:
            return Response({"error": "Maximum 3 colonnes autorisées"}, status=400)

        return Response({
            "chart_data": chart_data,
            "selected_columns": selected_columns,
            "data_type": "aggregated" if len(selected_columns) < 3 else "raw_sample"
        })

    except Exception as e:
        return Response({"error": f"Erreur traitement données : {str(e)}"}, status=400)