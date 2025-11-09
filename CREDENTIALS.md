# 🔑 Identifiants de connexion - Système Intelligent

## Identifiants par défaut pour le développement

### 👤 Administrateur
- **Username:** `admin`
- **Password:** `admin123`
- **Email:** `admin@systeme-intelligent.com`

### 👨‍🏫 Enseignants
Tous les enseignants utilisent le mot de passe: `enseignant123`

| Username | Email | Département |
|----------|-------|-------------|
| `fontaine` | fontaine@systeme-intelligent.com | Informatique |
| `dupont` | dupont@systeme-intelligent.com | Informatique |
| `martin` | martin@systeme-intelligent.com | Mathématiques |
| `bernard` | bernard@systeme-intelligent.com | Réseaux |
| `thomas` | thomas@systeme-intelligent.com | IA |

### 👨‍🎓 Étudiants
Tous les étudiants utilisent le mot de passe: `etudiant123`

Format des identifiants:
- **Username:** `etudiant001`, `etudiant002`, `etudiant003`, ... `etudiant010`
- **Email:** `etudiant001@systeme-intelligent.com`, `etudiant002@systeme-intelligent.com`, etc.
- **Matricule:** `ETU00001`, `ETU00002`, `ETU00003`, ... `ETU00010`

## 📝 Notes

- Ces identifiants sont créés automatiquement par le script `seed_database.py`
- **⚠️ IMPORTANT:** Changez ces mots de passe en production!
- Les étudiants sont répartis sur différents niveaux (L1, L2, L3, M1, M2) et parcours (IG, GL, RT, GE, CF)

## 🔄 Régénération des identifiants

Pour régénérer les identifiants, exécutez:

```bash
cd backend
python seed_database.py
```

**Note:** Le script vérifie si les utilisateurs existent déjà et ne les recrée pas, sauf si vous supprimez d'abord les données de la base.

