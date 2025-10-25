from django.db import models

class StatistiqueDescriptive(models.Model):
    TYPE_CHOICES = [
        ('num', 'Numérique'),
        ('cat', 'Catégorielle'),
        ('date', 'Date'),
    ]

    nom_colonne = models.CharField(max_length=255)
    nb_valeurs_manquantes = models.IntegerField()
    nb_valeurs_non_manquantes = models.IntegerField()
    type_colonne = models.CharField(max_length=10, choices=TYPE_CHOICES)

    # Numériques
    min_val = models.FloatField(null=True, blank=True)
    max_val = models.FloatField(null=True, blank=True)
    moyenne = models.FloatField(null=True, blank=True)
    skewness = models.FloatField(null=True, blank=True)
    mediane = models.FloatField(null=True, blank=True)
    mode_val = models.CharField(max_length=255, null=True, blank=True)
    ecart_type = models.FloatField(null=True, blank=True)
    kurtosis = models.FloatField(null=True, blank=True)
    variance = models.FloatField(null=True, blank=True)
    etendue = models.FloatField(null=True, blank=True)
    distribution = models.JSONField(null=True, blank=True)
    quartile = models.JSONField(null=True, blank=True)
    total = models.FloatField(null=True, blank=True)

    # Catégorielles
    nb_categories_uniques = models.IntegerField(null=True, blank=True)
    frequence = models.JSONField(null=True, blank=True)

    # Dates
    premiere_date = models.DateTimeField(null=True, blank=True)
    derniere_date = models.DateTimeField(null=True, blank=True)
    intervalle_total = models.CharField(max_length=255, null=True, blank=True)
    frequence_par_periode = models.JSONField(null=True, blank=True)

    def __str__(self):
        return f"{self.nom_colonne} ({self.type_colonne})"
