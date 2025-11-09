# models/__init__.py

from .user import Utilisateur, Etudiant, Enseignant, Admin
from .document import Document
from .qcm import QCM, Question # OptionReponse a été supprimé, on utilise maintenant Question avec format CSV
from .reponse_composee import ReponseComposee
from .resultat import Resultat
from .niveau_parcours import Niveau, Parcours, Mention
from .matiere import Matiere, MatiereEnseignantNiveauParcours