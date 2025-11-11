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
from sentence_transformers import SentenceTransformer
import faiss
import pickle
import numpy as np

API_KEY = "45be6155dee04ec1bc5a8b82900600e2.eGGiJpghbTTumj-LV7Y-sVtM"

client = Client(
    host="https://ollama.com",
    headers={'Authorization': 'Bearer ' + API_KEY}
)

embed_model = SentenceTransformer("all-MiniLM-L6-v2")

def save_index(index, filenames, folder_path):
    faiss.write_index(index, os.path.join(folder_path, "faiss.index"))
    with open(os.path.join(folder_path, "filenames.pkl"), "wb") as f:
        pickle.dump(filenames, f)
    print("✅ Index FAISS sauvegardé sur disque.")

def load_index(folder_path):
    try:
        index = faiss.read_index(os.path.join(folder_path, "faiss.index"))
        with open(os.path.join(folder_path, "filenames.pkl"), "rb") as f:
            filenames = pickle.load(f)
        print("✅ Index FAISS chargé depuis le disque.")
        return index, filenames
    except Exception:
        print("⚠️ Aucun index FAISS trouvé, reconstruction nécessaire.")
        return None, None

def build_faiss_index(doc_texts):
    print("🔹 Construction de l'index FAISS...")
    embeddings = embed_model.encode(doc_texts, convert_to_numpy=True)
    dim = embeddings.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(embeddings)
    print(f"🔹 Index construit avec {len(doc_texts)} documents.")
    return index, embeddings

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

    # Lire tous les fichiers .txt
    doc_texts = []
    filenames = []
    for txt_file in os.listdir(analyse_folder):
        if txt_file.endswith(".txt"):
            path = os.path.join(analyse_folder, txt_file)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                doc_texts.append(content)
                filenames.append(txt_file)
                print(f"📄 Fichier chargé : {txt_file} ({len(content)} caractères)")
            except Exception as e:
                print(f"⚠️ Impossible de lire {txt_file}: {e}")

    if not doc_texts:
        return Response({
            "reply": "❌ Aucun fichier texte trouvé pour l'analyse.",
            "status": "error"
        })

    # Charger l'index FAISS existant si disponible
    index, saved_filenames = load_index(analyse_folder)

    # Reconstruire l'index si nouveaux fichiers ajoutés ou pas d'index
    if index is None or set(filenames) != set(saved_filenames):
        print("⚡ Reconstruction de l'index FAISS...")
        index, embeddings = build_faiss_index(doc_texts)
        save_index(index, filenames, analyse_folder)
    else:
        print("🔹 Index FAISS existant utilisé.")

    # Rechercher les documents les plus pertinents
    query_embedding = embed_model.encode([user_message], convert_to_numpy=True)
    k = min(3, len(filenames))
    distances, indices = index.search(query_embedding, k)

    print("🔹 Résultats de la recherche :")
    for i, idx in enumerate(indices[0]):
        print(f" - {filenames[idx]} | distance = {distances[0][i]}")

    # Construire le contexte et les scores de pertinence
    threshold = 20
    context = ""
    doc_scores = {}
    for i, idx in enumerate(indices[0]):
        if distances[0][i] > threshold:
            print(f"❌ Ignoré {filenames[idx]} (distance > {threshold})")
            continue
        print(f"✅ Utilisé {filenames[idx]} dans le contexte")
        context += f"--- Contenu de {filenames[idx]} ---\n{doc_texts[idx]}\n\n"
        # Score : plus la distance est faible, plus le score est élevé
        doc_scores[filenames[idx]] = 1 / (1 + distances[0][i])

    if not context:
        context = "Aucune information pertinente trouvée dans les documents."
        print("⚠️ Aucun document pertinent trouvé pour cette requête.")

    # Construire le message pour Ollama
    messages = [
        {'role': 'system', 'content': (
            "Tu réponds toujours de façon courte et précise. "
            "Utilise le texte fourni comme source pour les questions sur le dataset, "
            "mais tu peux aussi répondre à des questions générales normales. "
            "Si il n'y a pas d'information dans le dataset, réponds de la manière dont tu penses. "
            "La réponse doit faire une phrase. "
            "Quand tu repondras, ne parle pas de manière technique, la personne qui te parle n'a pas de compétence technique"
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
            "status": "success",
            "doc_scores": {f: round(s * 100, 1) for f, s in doc_scores.items()}  # score en %
        })

    except Exception as e:
        print(f"❌ Erreur Ollama: {e}")
        return Response({
            "reply": f"Erreur lors de l'appel à Ollama: {str(e)}",
            "status": "error"
        })
