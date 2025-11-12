# prediction/views.py

import os
import json
import base64
from io import BytesIO

import pandas as pd
import matplotlib
matplotlib.use('Agg')  # Backend non interactif pour serveur
import matplotlib.pyplot as plt
import numpy as np

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.linear_model import LinearRegression, Ridge, Lasso, ElasticNet, LogisticRegression
from sklearn.tree import DecisionTreeRegressor, DecisionTreeClassifier
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier, GradientBoostingRegressor, GradientBoostingClassifier
from sklearn.svm import SVR, SVC
from sklearn.naive_bayes import GaussianNB
from sklearn.cluster import KMeans, AgglomerativeClustering, DBSCAN
from sklearn.metrics import (
    r2_score, mean_absolute_error, mean_squared_error,
    accuracy_score, precision_score, recall_score, f1_score, confusion_matrix,
    silhouette_score, calinski_harabasz_score, davies_bouldin_score
)

import shap
from lime.lime_tabular import LimeTabularExplainer

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.conf import settings

import joblib



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_target_name(request):
    username = request.query_params.get('username')
    folder = request.query_params.get('folder')

    if not username or not folder:
        return Response({"error": "Paramètres manquants"}, status=400)

    base_path = os.path.join(settings.MEDIA_ROOT, username, folder, "analyse")
    cible_path = os.path.join(base_path, "cible.json")
    stat_path = os.path.join(base_path, "statistique_descriptive.json")

    if not os.path.exists(cible_path):
        return Response({"error": "Fichier cible.json introuvable"}, status=404)
    if not os.path.exists(stat_path):
        return Response({"error": "Fichier statistique_descriptive.json introuvable"}, status=404)

    try:
        import json

        # 🔹 Lecture du fichier cible.json
        with open(cible_path, "r", encoding="utf-8") as f:
            cible_data = json.load(f)
        target_name = cible_data.get("target") or cible_data.get("cible")
        if not target_name:
            return Response({"error": "Nom de cible non trouvé dans cible.json"}, status=400)

        # 🔹 Lecture du fichier statistique_descriptive.json
        with open(stat_path, "r", encoding="utf-8") as f:
            stats_data = json.load(f)

        target_type = None
        for col in stats_data:
            if col.get("nom_colonne") == target_name:
                target_type = col.get("type_colonne")
                break

        if not target_type:
            return Response({
                "target": target_name,
                "error": "Type non trouvé dans statistique_descriptive.json"
            }, status=400)

        # ✅ Réponse finale
        return Response({
            "target": target_name,
            "type": target_type
        })

    except Exception as e:
        return Response({"error": f"Erreur lors de la lecture des fichiers : {str(e)}"}, status=500)



import os
import json
import pandas as pd
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression, Ridge, Lasso, ElasticNet, LogisticRegression
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier, GradientBoostingClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.cluster import KMeans, AgglomerativeClustering, DBSCAN
from sklearn.metrics import (
    r2_score,
    mean_absolute_error,
    mean_squared_error,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    silhouette_score,
    calinski_harabasz_score,
    davies_bouldin_score
)
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.conf import settings

import os
import json
import pandas as pd
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression, Ridge, Lasso, ElasticNet, LogisticRegression
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier, GradientBoostingClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.cluster import KMeans, AgglomerativeClustering, DBSCAN
from sklearn.metrics import (
    r2_score, mean_absolute_error, mean_squared_error,
    accuracy_score, precision_score, recall_score, f1_score, confusion_matrix,
    silhouette_score, calinski_harabasz_score, davies_bouldin_score
)
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.conf import settings

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def search_model(request):
    print("🔹 Début de la fonction search_model")

    username = request.data.get("username")
    folder = request.data.get("folder")
    target = request.data.get("target")
    prediction_type = request.data.get("prediction_type")

    print(f"🔸 Paramètres reçus -> username={username}, folder={folder}, target={target}, prediction_type={prediction_type}")

    if not all([username, folder, target, prediction_type]):
        print("❌ Paramètres manquants")
        return Response({"error": "Paramètres manquants"}, status=400)

    base_path = os.path.join(settings.MEDIA_ROOT, username, folder)
    analyse_path = os.path.join(base_path, "analyse")
    file_path = os.path.join(analyse_path, "file_combined.csv")

    print(f"📂 Chemin fichier combiné : {file_path}")
    if not os.path.exists(file_path):
        print("❌ Fichier file_combined.csv introuvable")
        return Response({"error": "Fichier file_combined.csv introuvable"}, status=404)

    try:
        # Lecture CSV
        print("📖 Lecture du CSV...")
        df = pd.read_csv(file_path)
        print(f"✅ CSV chargé avec {df.shape[0]} lignes et {df.shape[1]} colonnes")

        X = df.drop(columns=[target])
        y = df[target]

        # Encodage colonnes catégorielles
        encoders = {}
        for col in X.select_dtypes(include=['object', 'category']).columns:
            print(f"🔧 Encodage de la colonne {col}")
            le = LabelEncoder()
            X[col] = le.fit_transform(X[col].astype(str))
            encoders[col] = le

        # Encodage cible si nécessaire
        if y.dtype == 'object' or y.dtype.name == 'category':
            print(f"🔧 Encodage de la cible {target}")
            le_target = LabelEncoder()
            y_enc = le_target.fit_transform(y.astype(str))
            encoders[target] = le_target
            # 🔹 Sauvegarde du LabelEncoder de la cible pour la fonction predict
            joblib.dump(le_target, os.path.join(analyse_path, "target_encoder.pkl"))
        else:
            y_enc = y


        # Corrélations pour sélectionner colonnes numériques seulement
        print("📊 Calcul des corrélations...")
        df_corr = X.copy()
        df_corr[target] = y_enc
        numeric_cols = df_corr.select_dtypes(include=[np.number]).columns.tolist()
        if target in numeric_cols:
            correlations = df_corr[numeric_cols].corr()[target].drop(target)
            correlations = correlations.replace([np.inf, -np.inf], 0).fillna(0)
            selected_cols = correlations[correlations.abs() > 0.01].index.tolist()
        else:
            selected_cols = X.columns.tolist()  # pour classification, garder tout
        print(f"✅ Colonnes sélectionnées : {selected_cols}")

        X_reduced = X[selected_cols]
        os.makedirs(analyse_path, exist_ok=True)

        # Génération JSON selected_columns
        print("🧾 Génération du fichier selected_columns.json...")
        selected_columns_info = {}
        for col in selected_cols:
            col_data_orig = df[col]
            if pd.api.types.is_numeric_dtype(col_data_orig):
                selected_columns_info[col] = {
                    "type": "numerical",
                    "min": float(col_data_orig.min()),
                    "max": float(col_data_orig.max())
                }
            else:
                le = encoders.get(col)
                if le is not None:
                    mapping = {cls: int(code) for code, cls in enumerate(le.classes_)}
                    selected_columns_info[col] = {
                        "type": "categorical",
                        "categories": list(mapping.keys()),
                        "mapping": mapping
                    }
                else:
                    selected_columns_info[col] = {
                        "type": "categorical",
                        "categories": sorted(col_data_orig.dropna().unique().astype(str).tolist())
                    }

        json_path = os.path.join(analyse_path, "selected_columns.json")
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(selected_columns_info, f, ensure_ascii=False, indent=4)
        print(f"✅ Fichier JSON créé : {json_path}")

        # Split train/test
        print("✂️ Division en train/test (sans standardisation)...")
        X_train, X_test, y_train, y_test = train_test_split(
            X_reduced, y_enc, test_size=0.2, random_state=42
        )

        # Sauvegarde train/test
        pd.DataFrame(X_train, columns=selected_cols).to_csv(os.path.join(analyse_path, "X_train.csv"), index=False)
        pd.DataFrame(X_test, columns=selected_cols).to_csv(os.path.join(analyse_path, "X_test.csv"), index=False)
        pd.DataFrame(y_train, columns=[target]).to_csv(os.path.join(analyse_path, "y_train.csv"), index=False)
        pd.DataFrame(y_test, columns=[target]).to_csv(os.path.join(analyse_path, "y_test.csv"), index=False)

        # Initialisation modèles
        print(f"🏗️ Initialisation des modèles pour {prediction_type}...")
        models_results = []

        if prediction_type == "Régression":
            models = [
                ("LinearRegression", LinearRegression()),
                ("Ridge", Ridge()),
                ("Lasso", Lasso()),
                ("ElasticNet", ElasticNet()),
                ("RandomForestRegressor", RandomForestRegressor())
            ]
        elif prediction_type == "Classification":
            models = [
                ("LogisticRegression", LogisticRegression(max_iter=1000)),
                ("DecisionTreeClassifier", DecisionTreeClassifier()),
                ("RandomForestClassifier", RandomForestClassifier()),
                ("GradientBoostingClassifier", GradientBoostingClassifier()),
                ("GaussianNB", GaussianNB())
            ]
        elif prediction_type == "Clustering":
            models = [
                ("KMeans", KMeans(n_clusters=3, random_state=42)),
                ("AgglomerativeClustering", AgglomerativeClustering(n_clusters=3)),
                ("DBSCAN", DBSCAN(eps=0.5, min_samples=5))
            ]
        

        else:
            return Response({"error": "Type de prédiction inconnu"}, status=400)

        models_path = os.path.join(analyse_path, "models")
        os.makedirs(models_path, exist_ok=True)

        # Entraînement modèles
        print("🚀 Entraînement des modèles...")
        for name, model in models:
            print(f"🔹 Entraînement du modèle : {name}")
            try:
                if prediction_type in ["Régression", "Classification"]:
                    model.fit(X_train, y_train)
                elif prediction_type == "Clustering":
                    labels = model.fit_predict(X_reduced)

                joblib.dump(model, os.path.join(models_path, f"{name}.pkl"))

                # Calcul métriques
                metrics = {}
                if prediction_type == "Régression":
                    y_pred = model.predict(X_train)
                    metrics = {
                        "r2": round(r2_score(y_train, y_pred), 4),
                        "mae": round(mean_absolute_error(y_train, y_pred), 4),
                        "mse": round(mean_squared_error(y_train, y_pred), 4),
                        "rmse": round(mean_squared_error(y_train, y_pred) ** 0.5, 4)
                    }
                elif prediction_type == "Classification":
                    y_pred = model.predict(X_train)
                    metrics = {
                        "accuracy": round(accuracy_score(y_train, y_pred), 4),
                        "precision": round(precision_score(y_train, y_pred, average="weighted", zero_division=0), 4),
                        "recall": round(recall_score(y_train, y_pred, average="weighted", zero_division=0), 4),
                        "f1_score": round(f1_score(y_train, y_pred, average="weighted", zero_division=0), 4),
                       
                    }
                elif prediction_type == "Clustering":
                    try: sil = silhouette_score(X_reduced, labels)
                    except: sil = None
                    try: ch = calinski_harabasz_score(X_reduced, labels)
                    except: ch = None
                    try: db = davies_bouldin_score(X_reduced, labels)
                    except: db = None
                    metrics = {
                        "silhouette": round(sil, 4) if sil is not None else None,
                        "calinski_harabasz": round(ch, 4) if ch is not None else None,
                        "davies_bouldin": round(db, 4) if db is not None else None
                    }

                models_results.append({"name": name, "metrics": metrics})
                print(f"✅ Modèle {name} entraîné avec succès")
            except Exception as e:
                print(f"❌ Erreur avec le modèle {name} : {e}")

        # Meilleur modèle
        best_model = None
        if models_results:
            if prediction_type == "Régression":
                best_model = max(models_results, key=lambda m: m["metrics"]["r2"])
            elif prediction_type == "Classification":
                best_model = max(models_results, key=lambda m: m["metrics"]["accuracy"])
            elif prediction_type == "Clustering":
                def safe_sil(m):
                    return m["metrics"]["silhouette"] if m["metrics"]["silhouette"] is not None else -999
                best_model = max(models_results, key=safe_sil)

        print(f"🌟 Meilleur modèle : {best_model['name'] if best_model else 'Aucun'}")

        return Response({
            "selected_columns": selected_columns_info,
            "models": models_results,
            "recommended": best_model
        })

    except Exception as e:
        print(f"❌ Erreur interne : {e}")
        return Response({"error": f"Erreur interne: {str(e)}"}, status=500)



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def use_model(request):
    print("🔍 Requête reçue dans use_model")

    username = request.data.get("username")
    folder = request.data.get("folder")
    model_name = request.data.get("model_name")
    prediction_type = request.data.get("prediction_type")

    print(f"📦 Paramètres reçus : username={username}, folder={folder}, model_name={model_name}, prediction_type={prediction_type}")

    if not all([username, folder, model_name, prediction_type]):
        return Response({"error": "Paramètres manquants"}, status=400)

    base_path = os.path.join(settings.MEDIA_ROOT, username, folder, "analyse")
    model_path = os.path.join(base_path, "models", f"{model_name}.pkl")
    if not os.path.exists(model_path):
        return Response({"error": "Modèle introuvable"}, status=404)

    # Charger le modèle
    try:
        model = joblib.load(model_path)
        print("✅ Modèle chargé avec succès")
    except Exception as e:
        return Response({"error": f"Erreur lors du chargement du modèle : {str(e)}"}, status=500)

    # ---------------------------
    # 🧩 CAS CLUSTERING
    # ---------------------------
    if prediction_type == "Clustering":
        file_encoded_path = os.path.join(base_path, "file_encoded.csv")
        file_real_path = os.path.join(base_path, "file_combined.csv")  # fichier réel

        if not os.path.exists(file_encoded_path) or not os.path.exists(file_real_path):
            return Response({"error": "Fichier introuvable"}, status=404)

        try:
            # Données numériques pour clustering
            df_encoded = pd.read_csv(file_encoded_path)
            X = df_encoded.select_dtypes(include=[np.number])
            print(f"✅ Données numériques pour clustering, shape={X.shape}")

            labels = model.fit_predict(X)
            print(f"🔹 Labels générés par fit_predict, shape={labels.shape}")

            # Sauvegarde des labels
            labels_path = os.path.join(base_path, "cluster_labels.csv")
            pd.DataFrame({"cluster": labels}).to_csv(labels_path, index=False)
            print(f"📁 Labels de cluster sauvegardés : {labels_path}")

            # Calcul des métriques clustering
            try: sil = silhouette_score(X, labels)
            except: sil = None
            try: ch = calinski_harabasz_score(X, labels)
            except: ch = None
            try: db = davies_bouldin_score(X, labels)
            except: db = None

            metrics = {
                "silhouette": round(sil, 4) if sil is not None else None,
                "calinski_harabasz": round(ch, 4) if ch is not None else None,
                "davies_bouldin": round(db, 4) if db is not None else None
            }
            print(f"📊 Métriques calculées : {metrics}")

            # Résumé sur les vraies valeurs
            df_real = pd.read_csv(file_real_path)
            df_real['cluster'] = labels

            cluster_summary_dict = {}
            for clus, group in df_real.groupby('cluster'):
                summary = {}
                for col in df_real.columns:
                    if col == 'cluster':
                        continue
                    if pd.api.types.is_numeric_dtype(group[col]):
                        summary[f"{col}_count"] = int(group[col].count())
                        summary[f"{col}_mean"] = float(group[col].mean())
                        summary[f"{col}_min"] = float(group[col].min())
                        summary[f"{col}_max"] = float(group[col].max())
                    else:
                        summary[f"{col}_count"] = int(group[col].count())
                        summary[f"{col}_mode"] = str(group[col].mode().iloc[0]) if not group[col].empty else None
                cluster_summary_dict[int(clus)] = summary

            cluster_data = {int(clus): group.drop(columns=['cluster']).to_dict(orient='records') for clus, group in df_real.groupby('cluster')}



            return Response({
                "message": f"Modèle de clustering {model_name} appliqué avec succès.",
                "model_name": model_name,
                "metrics": metrics,
                "cluster_labels_file": labels_path,
                "cluster_summary": cluster_summary_dict,
                "cluster_data": cluster_data
            })

        except Exception as e:
            return Response({"error": f"Erreur lors du clustering : {str(e)}"}, status=500)

    # ---------------------------
    # 🧩 CAS CLASSIFICATION / RÉGRESSION
    # ---------------------------
    test_X_path = os.path.join(base_path, "X_test.csv")
    test_y_path = os.path.join(base_path, "y_test.csv")
    if not os.path.exists(test_X_path) or not os.path.exists(test_y_path):
        return Response({"error": "Données de test introuvables"}, status=404)

    try:
        X_test = pd.read_csv(test_X_path)
        y_test = pd.read_csv(test_y_path)
        score = model.score(X_test, y_test.values.ravel())
    except Exception as e:
        return Response({"error": f"Erreur lors de la prédiction ou du calcul du score : {str(e)}"}, status=500)

    # 🔹 Feature Importance
    feature_importance = None
    if prediction_type in ["Régression", "Classification"]:
        try:
            if hasattr(model, 'feature_importances_'):
                # For tree-based models
                importance_scores = model.feature_importances_
            elif hasattr(model, 'coef_'):
                # For linear models
                importance_scores = np.abs(model.coef_)
                if len(importance_scores.shape) > 1:
                    importance_scores = importance_scores.mean(axis=0)
            else:
                importance_scores = None
                
            if importance_scores is not None:
                # Create feature importance mapping
                features = X_test.columns.tolist()
                feature_importance = {
                    feature: float(score) 
                    for feature, score in zip(features, importance_scores)
                }
                # Sort by importance
                feature_importance = dict(sorted(
                    feature_importance.items(), 
                    key=lambda x: x[1], 
                    reverse=True
                ))
        except Exception as e:
            print(f"⚠️ Erreur calcul feature importance: {e}")
            feature_importance = None

    # Charger selected_columns.json
    selected_columns_path = os.path.join(base_path, "selected_columns.json")
    if os.path.exists(selected_columns_path):
        try:
            with open(selected_columns_path, "r", encoding="utf-8") as f:
                selected_columns_info = json.load(f)
        except:
            selected_columns_info = {}
    else:
        selected_columns_info = {}

    response_data = {
        "message": f"Modèle {model_name} évalué avec succès sur les données de test.",
        "model_name": model_name,
        "selected_columns": selected_columns_info,
        "score": round(score, 4),
        "feature_importance": feature_importance  # ← NOUVEAU
    }

    return Response(response_data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def predict(request):
    model_name = request.data.get('model_name')
    input_values = request.data.get('input_values')  # dict attendu
    username = request.data.get('username')
    folder = request.data.get('folder')

    print(f"Received model_name: {model_name}")
    print(f"Received input_values: {input_values}")
    print(f"Received username: {username}")
    print(f"Received folder: {folder}")

    if not model_name or input_values is None or not username or not folder:
        print("❌ Missing parameters")
        return Response({"error": "Paramètres 'model_name', 'input_values', 'username' et 'folder' requis"}, status=400)

    # 🔹 Chemins des fichiers
    analyse_path = os.path.join(settings.MEDIA_ROOT, username, folder, "analyse")
    model_path = os.path.join(analyse_path, "models", f"{model_name}.pkl")
    json_path = os.path.join(analyse_path, "selected_columns.json")

    if not os.path.exists(model_path):
        print(f"❌ Modèle non trouvé : {model_path}")
        return Response({"error": f"Modèle '{model_name}' non trouvé"}, status=404)
    if not os.path.exists(json_path):
        print(f"❌ Fichier selected_columns.json manquant : {json_path}")
        return Response({"error": "Fichier selected_columns.json introuvable"}, status=404)

    # 🔹 Chargement du modèle et du fichier JSON
    print("📂 Chargement du modèle et du fichier JSON...")
    model = joblib.load(model_path)
    with open(json_path, "r", encoding="utf-8") as f:
        selected_columns = json.load(f)

    print("✅ Modèle et mappings chargés avec succès")

    # 🔹 Conversion des valeurs catégorielles
    converted_inputs = {}
    for col, value in input_values.items():
        if col in selected_columns:
            col_info = selected_columns[col]
            if col_info["type"] == "categorical":
                mapping = col_info.get("mapping", {})
                # correspondance insensible à la casse et espaces
                mapping_lower = {k.lower().strip(): v for k, v in mapping.items()}
                if isinstance(value, str):
                    val_lower = value.lower().strip()
                    if val_lower in mapping_lower:
                        converted_inputs[col] = mapping_lower[val_lower]
                        print(f"🔁 '{col}' : '{value}' → {mapping_lower[val_lower]}")
                    else:
                        print(f"⚠️ Valeur '{value}' non trouvée pour '{col}', mise à NaN")
                        converted_inputs[col] = None
                else:
                    converted_inputs[col] = value
            else:
                converted_inputs[col] = value
        else:
            print(f"⚠️ Colonne inconnue : {col}")
            converted_inputs[col] = value

    print(f"🔹 Valeurs finales pour prédiction : {converted_inputs}")

    # 🔹 Création du DataFrame
    try:
        input_df = pd.DataFrame([converted_inputs])
        print("📊 DataFrame de prédiction créé :")
        print(input_df)

        # 🔹 Prédiction
        prediction = model.predict(input_df)
        print(f"✅ Prédiction brute effectuée : {prediction}")

        # 🔹 Reconversion en catégorie si classification
        target_encoder_path = os.path.join(analyse_path, "target_encoder.pkl")
        if hasattr(model, "_estimator_type") and model._estimator_type == "classifier":
            if os.path.exists(target_encoder_path):
                target_encoder = joblib.load(target_encoder_path)
                if hasattr(target_encoder, "inverse_transform"):
                    prediction_labels = target_encoder.inverse_transform(prediction)
                else:
                    prediction_labels = prediction
            else:
                prediction_labels = prediction
        else:
            # 🔹 Si régression, ne pas reconvertir
            prediction_labels = prediction


        print(f"🔹 Prédiction finale en labels : {prediction_labels}")

        # 🔹 Feature Importance for current prediction
        current_prediction_importance = None
        try:
            if hasattr(model, 'feature_importances_'):
                # Global feature importance
                features = input_df.columns.tolist()
                importance_scores = model.feature_importances_
                current_prediction_importance = {
                    feature: float(score) 
                    for feature, score in zip(features, importance_scores)
                }
                # Sort by importance
                current_prediction_importance = dict(sorted(
                    current_prediction_importance.items(), 
                    key=lambda x: x[1], 
                    reverse=True
                ))
        except Exception as e:
            print(f"⚠️ Erreur feature importance prédiction: {e}")
                
                

        return Response({
            "model_name": model_name,
            "input_values": input_values,
            "converted_inputs": converted_inputs,
            "prediction": prediction_labels.tolist() if hasattr(prediction_labels, 'tolist') else prediction_labels,
            "feature_importance": current_prediction_importance,  # ← NOUVEAU
            "message": "Prédiction réussie"
        })

    except Exception as e:
        print(f"❌ Erreur lors de la prédiction : {e}")
        return Response({"error": f"Erreur lors de la prédiction: {str(e)}"}, status=500)

import os
import json
import pandas as pd
import numpy as np
import pickle
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def search_model_prevision(request):
    print("🔹 Début de la fonction search_model_prevision")

    username = request.data.get("username")
    folder = request.data.get("folder")
    print(f"🔸 Paramètres reçus -> username={username}, folder={folder}")

    if not username or not folder:
        return Response({"error": "Paramètres 'username' et 'folder' requis"}, status=400)

    # 🔹 Dossiers et chemins
    analyse_path = os.path.join(settings.MEDIA_ROOT, username, folder, "analyse")
    file_combined_path = os.path.join(analyse_path, "file_combined.csv")
    cible_path = os.path.join(analyse_path, "cible.json")
    model_path = os.path.join(analyse_path, "model_prevision")
    os.makedirs(model_path, exist_ok=True)

    if not os.path.exists(file_combined_path):
        return Response({"error": "Fichier file_combined.csv introuvable"}, status=404)
    if not os.path.exists(cible_path):
        return Response({"error": "Fichier cible.json introuvable"}, status=404)

    try:
        # 🔹 Charger les données
        df = pd.read_csv(file_combined_path)
        print(f"📊 CSV chargé avec {df.shape[0]} lignes et {df.shape[1]} colonnes")

        # 🔹 Charger la cible
        with open(cible_path, "r") as f:
            cible_data = json.load(f)
        target = cible_data.get("cible")
        if not target or target not in df.columns:
            return Response({"error": f"Colonne cible '{target}' introuvable"}, status=400)
        print(f"🎯 Colonne cible détectée : {target}")

        # 🔹 Reconstruction des dates éclatées
        date_columns = set()
        for col in df.columns:
            if col.endswith("_jour") or col.endswith("_mois") or col.endswith("_annee"):
                date_columns.add(col.rsplit("_", 1)[0])
        print(f"🔹 Colonnes date détectées : {date_columns}")

        for date_base in date_columns:
            jour_col = f"{date_base}_jour"
            mois_col = f"{date_base}_mois"
            annee_col = f"{date_base}_annee"
            if all(c in df.columns for c in [jour_col, mois_col, annee_col]):
                mois_mapping = {
                    'Janvier': '01','Février':'02','Mars':'03','Avril':'04','Mai':'05','Juin':'06',
                    'Juillet':'07','Août':'08','Septembre':'09','Octobre':'10','Novembre':'11','Décembre':'12'
                }
                mois_series = df[mois_col].astype(str).map(lambda x: mois_mapping.get(x,x).zfill(2))
                df[date_base] = pd.to_datetime(
                    df[annee_col].astype(str) + "-" + mois_series + "-" + df[jour_col].astype(str).str.zfill(2),
                    errors='coerce'
                )
                df.drop(columns=[jour_col, mois_col, annee_col], inplace=True, errors='ignore')
                print(f"✅ Colonne {date_base} reconstruite et colonnes sources supprimées")

        # Supprimer les lignes avec dates manquantes
        if date_columns:
            df.dropna(subset=date_columns, inplace=True)
            df.reset_index(drop=True, inplace=True)

        # 🔹 Encodage dynamique des variables catégorielles
        cat_cols = df.select_dtypes(include=['object']).columns.tolist()
        if cat_cols:
            print(f"🔠 Encodage variables catégorielles : {cat_cols}")
            df = pd.get_dummies(df, columns=cat_cols, drop_first=True)

        if target not in df.columns:
            return Response({"error": f"La colonne cible '{target}' ne peut pas être encodée automatiquement."}, status=400)

        # 🔹 Séparation train/test
        X = df.drop(columns=[target])
        y = df[target]
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, shuffle=False)

        # 🔹 Sauvegarde fichiers
        train_path = os.path.join(analyse_path, "train_prevision.csv")
        test_path = os.path.join(analyse_path, "test_prevision.csv")
        X_train[target] = y_train
        X_test[target] = y_test
        X_train.to_csv(train_path, index=False)
        X_test.to_csv(test_path, index=False)
        print(f"✅ Fichiers enregistrés : {train_path}, {test_path}")

        # 🔹 Entraînement modèles
        results = []

        # Colonnes numériques pour éviter DType error
        numeric_cols = X_train.select_dtypes(include=['int64','float64']).columns.tolist()
        X_train_num = X_train[numeric_cols].copy()
        X_test_num = X_test[numeric_cols].copy()

        # Lag features
        lags = [1,2,3]
        for lag in lags:
            X_train_num[f"{target}_lag{lag}"] = y_train.shift(lag)
        X_train_num = X_train_num.dropna().reset_index(drop=True)
        y_train_final = y_train.iloc[-len(X_train_num):]

        # Lag features test
        last_train_values = y_train_final.values[-max(lags):].tolist()
        test_lags = []
        for i in range(len(X_test_num)):
            row_lags = last_train_values[-3:]
            test_lags.append(row_lags)
            if i < len(y_test):
                last_train_values.append(y_test.iloc[i])
        test_lags_df = pd.DataFrame(test_lags, columns=[f"{target}_lag{lag}" for lag in lags])
        X_test_num = pd.concat([X_test_num.reset_index(drop=True), test_lags_df], axis=1)
        y_test_final = y_test.iloc[:len(X_test_num)]

        # 🔹 RandomForest
        rf = RandomForestRegressor()
        rf.fit(X_train_num, y_train_final)
        y_pred_rf = rf.predict(X_test_num)
        results.append({
            "name": "RandomForestRegressor",
            "metrics": {
                "r2": round(r2_score(y_test_final, y_pred_rf),4),
                "mae": round(mean_absolute_error(y_test_final, y_pred_rf),4),
                "mse": round(mean_squared_error(y_test_final, y_pred_rf),4),
                "rmse": round(mean_squared_error(y_test_final, y_pred_rf)**0.5,4)
            }
        })

        # ✅ Sauvegarde des colonnes utilisées pour l'entraînement
        train_columns_path = os.path.join(model_path, "RandomForestRegressor_columns.json")
        with open(train_columns_path, "w") as f:
            json.dump(X_train_num.columns.tolist(), f)
        pickle.dump(rf, open(os.path.join(model_path,"RandomForestRegressor.pkl"),"wb"))

        # 🔹 GradientBoosting
        gb = GradientBoostingRegressor()
        gb.fit(X_train_num, y_train_final)
        y_pred_gb = gb.predict(X_test_num)
        results.append({
            "name": "GradientBoostingRegressor",
            "metrics": {
                "r2": round(r2_score(y_test_final, y_pred_gb),4),
                "mae": round(mean_absolute_error(y_test_final, y_pred_gb),4),
                "mse": round(mean_squared_error(y_test_final, y_pred_gb),4),
                "rmse": round(mean_squared_error(y_test_final, y_pred_gb)**0.5,4)
            }
        })
                # ✅ Sauvegarde des colonnes utilisées pour l'entraînement
        train_columns_path = os.path.join(model_path, "GradientBoostingRegressor_columns.json")
        with open(train_columns_path, "w") as f:
            json.dump(X_train_num.columns.tolist(), f)
        pickle.dump(gb, open(os.path.join(model_path,"GradientBoostingRegressor.pkl"),"wb"))

        # 🔹 ARIMA avec index temporel
        try:
            from statsmodels.tsa.arima.model import ARIMA
            y_train_final.index = pd.RangeIndex(start=0, stop=len(y_train_final))
            arima_model = ARIMA(y_train_final, order=(1,1,1)).fit()
            y_pred_arima = arima_model.forecast(steps=len(y_test_final))
            results.append({
                "name":"ARIMA",
                "metrics":{
                    "r2": round(r2_score(y_test_final,y_pred_arima),4),
                    "mae": round(mean_absolute_error(y_test_final,y_pred_arima),4),
                    "mse": round(mean_squared_error(y_test_final,y_pred_arima),4),
                    "rmse": round(mean_squared_error(y_test_final,y_pred_arima)**0.5,4)
                }
            })
            train_columns_path = os.path.join(model_path, "ARIMA_columns.json")
            with open(train_columns_path, "w") as f:
                json.dump(X_train_num.columns.tolist(), f)
            pickle.dump(arima_model, open(os.path.join(model_path,"ARIMA.pkl"),"wb"))
        except Exception as e:
            print(f"❌ ARIMA erreur : {e}")

        # 🔹 Prophet fiable
        try:
            from prophet import Prophet
            if date_columns:
                date_col = list(date_columns)[0]
                prophet_df = df[[date_col, target]].dropna().rename(columns={date_col:'ds', target:'y'})
                train_len = len(X_train)
                prophet_train_df = prophet_df.iloc[:train_len]
                prophet_model = Prophet()
                prophet_model.fit(prophet_train_df)
                future = prophet_model.make_future_dataframe(periods=len(X_test), freq='D')
                forecast = prophet_model.predict(future)
                y_pred_prophet = forecast['yhat'].iloc[-len(y_test_final):].values
                results.append({
                    "name":"Prophet",
                    "metrics":{
                        "r2": round(r2_score(y_test_final,y_pred_prophet),4),
                        "mae": round(mean_absolute_error(y_test_final,y_pred_prophet),4),
                        "mse": round(mean_squared_error(y_test_final,y_pred_prophet),4),
                        "rmse": round(mean_squared_error(y_test_final,y_pred_prophet)**0.5,4)
                    }
                })
                train_columns_path = os.path.join(model_path, "Prophet_columns.json")
                with open(train_columns_path, "w") as f:
                    json.dump(X_train_num.columns.tolist(), f)
                pickle.dump(prophet_model, open(os.path.join(model_path,"Prophet.pkl"),"wb"))
        except Exception as e:
            print(f"❌ Prophet erreur : {e}")

        # 🔹 Meilleur modèle
        best_model = max(results, key=lambda m:m["metrics"]["r2"]) if results else None

        return Response({
            "username": username,
            "folder": folder,
            "target": target,
            "models": results,
            "recommended": best_model
        })

    except Exception as e:
        print(f"❌ Erreur interne : {e}")
        return Response({"error": f"Erreur interne : {str(e)}"}, status=500)



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def use_model_prevision(request):
    print("🔹 Début de use_model_prevision")

    username = request.data.get("username")
    folder = request.data.get("folder")
    model_name = request.data.get("model_name")
    print(f"🔸 Paramètres reçus -> username={username}, folder={folder}, model_name={model_name}")

    if not username or not folder or not model_name:
        return Response({"error": "username, folder et model_name requis"}, status=400)

    try:
        # 🔹 Chemins
        analyse_path = os.path.join(settings.MEDIA_ROOT, username, folder, "analyse")
        test_path = os.path.join(analyse_path, "test_prevision.csv")
        cible_path = os.path.join(analyse_path, "cible.json")
        model_path = os.path.join(analyse_path, "model_prevision", f"{model_name}.pkl")
        columns_path = os.path.join(analyse_path, "model_prevision", f"{model_name}_columns.json")
        prevision_path = os.path.join(analyse_path, "prevision.json")  # <-- fichier final

        for path, msg in [(test_path, "test_prevision.csv introuvable"),
                          (cible_path, "cible.json introuvable"),
                          (model_path, f"Modèle {model_name}.pkl introuvable"),
                          (columns_path, f"Colonnes d'entraînement pour {model_name} introuvables")]:
            if not os.path.exists(path):
                print(f"❌ Chemin manquant: {path}")
                return Response({"error": msg}, status=404)

        # 🔹 Charger test CSV et cible
        df_test = pd.read_csv(test_path)
        print(f"✅ test_prevision.csv chargé avec {df_test.shape[0]} lignes et {df_test.shape[1]} colonnes")
        with open(cible_path, "r") as f:
            cible_data = json.load(f)
        target = cible_data.get("cible")
        print(f"✅ Colonne cible détectée: {target}")
        if target not in df_test.columns:
            print(f"❌ Colonne cible '{target}' introuvable dans le CSV")
            return Response({"error": f"Colonne cible '{target}' introuvable dans test_prevision.csv"}, status=400)

        # 🔹 Charger modèle
        with open(model_path, "rb") as f:
            model = pickle.load(f)
        print(f"✅ Modèle {model_name} chargé")

        # 🔹 Charger colonnes d'entraînement
        with open(columns_path, "r") as f:
            train_columns = json.load(f)
        print(f"✅ Colonnes d'entraînement chargées: {train_columns}")

        # 🔹 Créer X_test_num avec toutes les colonnes dans le même ordre que l'entraînement
        X_test_num = pd.DataFrame(index=df_test.index)
        for col in train_columns:
            if col in df_test.columns:
                X_test_num[col] = df_test[col]
            else:
                X_test_num[col] = 0  # si la colonne est manquante
        print(f"✅ X_test_num construit avec {X_test_num.shape[1]} colonnes")

        y_test = df_test[target]
        print(f"✅ y_test construit avec {len(y_test)} valeurs")

        # 🔹 Prédiction
        y_pred = model.predict(X_test_num)
        print(f"✅ Prédiction réussie, {len(y_pred)} valeurs prédites")

        # 🔹 Dates pour le front
        if "date" in df_test.columns:
            dates = pd.to_datetime(df_test["date"]).dt.strftime("%Y-%m-%d").tolist()
        else:
            dates = pd.date_range(end=pd.Timestamp.today(), periods=len(df_test)).strftime("%Y-%m-%d").tolist()
        print(f"✅ Dates prêtes, {len(dates)} valeurs")

        # 🔹 JSON final pour le front
        response_json = {
            "dates": dates,
            "observed": y_test.tolist(),
            "predicted": [None]*(len(y_test)-len(y_pred)) + y_pred.tolist() if len(y_pred) < len(y_test) else y_pred.tolist()
        }

        # 🔹 Sauvegarde dans prevision.json
        with open(prevision_path, "w") as f:
            json.dump(response_json, f, indent=4)
        print(f"✅ Response JSON sauvegardé dans {prevision_path}")

        return Response(response_json)

    except Exception as e:
        print(f"❌ Erreur use_model_prevision : {e}")
        return Response({"error": str(e)}, status=500)
