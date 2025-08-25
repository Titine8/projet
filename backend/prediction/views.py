# prediction/views.py
import os
import pandas as pd
from sklearn.model_selection import train_test_split
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.conf import settings
# prediction/views.py
from sklearn.linear_model import LinearRegression, Ridge, Lasso, ElasticNet
from sklearn.tree import DecisionTreeRegressor
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.svm import SVR
from sklearn.metrics import r2_score


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def split_data(request):
    username = request.data.get('username')
    folder = request.data.get('folder')
    file_name = request.data.get('file')
    target_col = request.data.get('target')

    if not username or not folder or not file_name or not target_col:
        return Response({"error": "Paramètres manquants"}, status=400)

    user_folder = os.path.join(settings.MEDIA_ROOT, username, folder)

    # 🔹 Transformer le fichier sélectionné en son équivalent encodé
    encoded_file_name = file_name.replace("file_", "encodage_")
    file_path = os.path.join(user_folder, encoded_file_name)

    if not os.path.exists(file_path):
        return Response({"error": f"Fichier encodé introuvable : {encoded_file_name}"}, status=404)

    # Noms des fichiers à générer
    x_train_file = f"x_train_{target_col}.csv"
    x_test_file = f"x_test_{target_col}.csv"
    y_train_file = f"y_train_{target_col}.csv"
    y_test_file = f"y_test_{target_col}.csv"

    # Vérifier si les 4 fichiers existent déjà
    existing_files = [
        os.path.exists(os.path.join(user_folder, f))
        for f in [x_train_file, x_test_file, y_train_file, y_test_file]
    ]

    if all(existing_files):
        return Response({
            "message": "Les fichiers de cette variable cible existent déjà.",
            "files": [x_train_file, y_train_file, x_test_file, y_test_file]
        })

    # Charger le dataset encodé
    if encoded_file_name.endswith('.csv'):
        df = pd.read_csv(file_path)
    else:
        df = pd.read_excel(file_path)

    if target_col not in df.columns:
        return Response({"error": "Colonne cible introuvable"}, status=400)

    X = df.drop(columns=[target_col])
    y = df[target_col]

    # Split 80% / 20%
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Sauvegarde des fichiers
    X_train.to_csv(os.path.join(user_folder, x_train_file), index=False)
    X_test.to_csv(os.path.join(user_folder, x_test_file), index=False)
    y_train.to_csv(os.path.join(user_folder, y_train_file), index=False)
    y_test.to_csv(os.path.join(user_folder, y_test_file), index=False)

    return Response({
        "message": f"Données divisées avec succès à partir du fichier encodé : {encoded_file_name}",
        "files": [x_train_file, y_train_file, x_test_file, y_test_file]
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def find_best_regression_model(request, username, folder, target_col):
    user_folder = os.path.join(settings.MEDIA_ROOT, username, folder)
    x_train_file = os.path.join(user_folder, f"x_train_{target_col}.csv")
    y_train_file = os.path.join(user_folder, f"y_train_{target_col}.csv")
    x_test_file = os.path.join(user_folder, f"x_test_{target_col}.csv")
    y_test_file = os.path.join(user_folder, f"y_test_{target_col}.csv")

    # Vérifier que les fichiers existent
    for f in [x_train_file, y_train_file, x_test_file, y_test_file]:
        if not os.path.exists(f):
            return Response({"error": f"Fichier manquant : {os.path.basename(f)}"}, status=404)

    # Charger les données
    X_train = pd.read_csv(x_train_file)
    X_test = pd.read_csv(x_test_file)
    y_train = pd.read_csv(y_train_file)
    y_test = pd.read_csv(y_test_file)

    # Liste des modèles
    models = {
        "LinearRegression": LinearRegression(),
        "Ridge": Ridge(),
        "Lasso": Lasso(),
        "ElasticNet": ElasticNet(),
        "DecisionTree": DecisionTreeRegressor(),
        "RandomForest": RandomForestRegressor(),
        "GradientBoosting": GradientBoostingRegressor(),
        "SVR": SVR(),
    }

    scores = {}
    for name, model in models.items():
        try:
            model.fit(X_train, y_train.values.ravel())
            y_pred = model.predict(X_test)
            score = r2_score(y_test, y_pred)
            scores[name] = round(score, 4)
        except Exception as e:
            scores[name] = str(e)

    # Trouver le meilleur modèle
    best_model = max(scores, key=lambda k: scores[k] if isinstance(scores[k], (int, float)) else -float('inf'))

    return Response({
        "scores": scores,
        "best_model": best_model
    })