from django.test import TestCase, Client
from django.conf import settings
import os, json
import pandas as pd

class InfluenceColumnsTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.username = "testuser"
        self.folder = "testfolder"
        self.file_name = "data.csv"
        self.user_folder = os.path.join(settings.MEDIA_ROOT, self.username, self.folder, "analyse")
        os.makedirs(self.user_folder, exist_ok=True)

        # Création du fichier CSV
        df = pd.DataFrame({
            "age": [25, 30, 45],
            "sexe": ["M", "F", "M"],
            "revenu": [3000, 4000, 5000]
        })
        df.to_csv(os.path.join(self.user_folder, self.file_name), index=False)

        # Création du fichier cible.json
        with open(os.path.join(self.user_folder, "cible.json"), "w", encoding="utf-8") as f:
            json.dump({"cible": "revenu"}, f)

    def test_influence_columns_success(self):
        response = self.client.get("/api/analyse/influence/", {
            "username": self.username,
            "folder": self.folder,
            "file": self.file_name
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("influences", data)
        self.assertIn("target", data)
        self.assertEqual(data["target"], "revenu")

    def test_influence_columns_missing_params(self):
        response = self.client.get("/api/analyse/influence/")  # URL corrigée
        self.assertEqual(response.status_code, 400)

    def test_influence_columns_file_not_found(self):
        response = self.client.get("/api/analyse/influence/", {
            "username": self.username,
            "folder": self.folder,
            "file": "inexistant.csv"
        })
        self.assertEqual(response.status_code, 404)
