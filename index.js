const express = require('express');
const app = express();
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const ExcelJS = require('exceljs');
const AdmZip = require('adm-zip');

// Répertoire contenant les dossiers
const folderPath = __dirname + '/carte'; // Remplacez par le chemin d'accès réel à vos dossiers
const folderDirectory = path.join(folderPath);

// Middleware pour le corps de la requête
app.use(express.urlencoded({ extended: true }));

// Middleware pour servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

// Page d'accueil
app.get('/', (req, res) => {
  const downloadLink = `<a href="/download">Télécharger le fichier Excel</a>`;
  res.send(downloadLink);
});

// Endpoint pour récupérer la liste de tous les dossiers
app.get('/allFolders', (req, res) => {
  fs.readdir(folderPath, (err, files) => {
    if (err) {
      console.log('Erreur lors de la lecture des dossiers :', err);
      res.status(500).json({ error: 'Erreur lors de la récupération des dossiers.' });
    } else {
      const folders = files.filter((file) => fs.statSync(path.join(folderPath, file)).isDirectory());
      res.json({ folders });
    }
  });
});

app.post('/deleteFolder', (req, res) => {
  const selectedFolders = req.body.folders; // Les dossiers sélectionnés

  if (selectedFolders && selectedFolders.length > 0) {
    selectedFolders.forEach(folderName => {
      const folderPath = path.join(__dirname, 'carte', folderName);

      // Vérifier si le dossier existe
      if (fs.existsSync(folderPath)) {
        // Supprimer le dossier et tous ses fichiers récursivement
        fs.rmSync(folderPath, { recursive: true });

        console.log('Dossier supprimé :', folderName);
      } else {
        console.log('Le dossier', folderName, "n'existe pas.");
      }
    });

    res.send('Dossiers supprimés avec succès.');
  } else {
    res.send('Aucun dossier sélectionné.');
  }
});

// Configurer Multer pour définir le dossier de destination
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(folderPath)); // Définir le dossier de destination des fichiers
  },
  filename: function (req, file, cb) {
    const originalname = file.originalname;
    cb(null, originalname); // Utiliser le nom d'origine du fichier
  }
});

// Créer l'instance de Multer avec la configuration
const upload = multer({ storage: storage });

// Définir la route de gestion de l'upload
app.post('/upload', upload.array('files'), (req, res) => {
  // Récupérer les fichiers uploadés
  const files = req.files;

  if (files && files.length > 0) {
    // Traiter les fichiers uploadés
    files.forEach(file => {
      console.log('Fichier uploadé :', file.filename);

      // Extraire les dossiers ZIP dans un sous-dossier avec le nom du fichier ZIP
      const extractFolderName = file.originalname.replace('.zip', ''); // Obtient le nom du dossier d'extraction en supprimant l'extension .zip
      const extractFolderPath = path.join(folderPath, extractFolderName); // Construit le chemin du sous-dossier d'extraction

      // Crée le sous-dossier d'extraction s'il n'existe pas
      if (!fs.existsSync(extractFolderPath)) {
        fs.mkdirSync(extractFolderPath);
      }

      const zip = new AdmZip(file.path); // Crée une instance d'AdmZip en passant le chemin du fichier ZIP

      // Extraire le contenu du ZIP dans le sous-dossier d'extraction
      zip.extractAllToAsync(extractFolderPath, true, (err) => {
        if (err) {
          console.error('Erreur lors de l\'extraction du ZIP :', err);
          return;
        }

        // Supprimer le fichier ZIP
        fs.unlinkSync(file.path); // Supprime le fichier ZIP

        console.log('Dossier ZIP extrait dans :', extractFolderPath);
      });
    });

    res.send('Fichiers uploadés avec succès.');
  } else {
    res.send('Aucun fichier uploadé.');
  }
});

// Déclarez un tableau pour suivre les questions ajoutées
const questionsAjoutees = [];

// Endpoint pour le téléchargement des dossiers
app.post('/download', (req, res) => {
  const selectedFolders = req.body.folders;
  const questionsListMax = req.body.questionsListMax;
  const filename = req.body.filename;

  if (!selectedFolders || selectedFolders.length === 0) {
    res.status(400).json({ error: 'Aucun dossier sélectionné.' });
    return;
  }

  const allQuestions = [];

  selectedFolders.forEach((folder) => {
    const folderPath = path.join(folderDirectory, folder);
    const jsonPath = path.join(folderPath, 'donnees.json');

    if (fs.existsSync(jsonPath)) {
      try {
        const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
        const jsonData = JSON.parse(jsonContent);

        jsonData.cartes.forEach((carte) => {
          const question = carte?.recto?.texte || '';
          const rectoPhoto = carte?.recto?.image || '';
          const synthese = getSyntheseFromFolderName(folder);

          if (question) {
            const photoPath = path.join(folderPath, 'fichiers', rectoPhoto);
            const photoExists = fs.existsSync(photoPath);

            allQuestions.push({ question, rectoPhoto, synthese, photoExists, photoPath });
          } else {
            console.warn(`La carte dans le fichier ${jsonPath} ne contient pas de propriété 'question'.`);
            console.log('Contenu du fichier JSON :', jsonData);
            console.log('Contenu de la carte :', carte);
          }
        });
      } catch (error) {
        console.error(`Une erreur s'est produite lors du traitement du fichier ${jsonPath}:`, error);
      }
    } else {
      console.log('Erreur: Le fichier JSON n\'existe pas');
    }
  });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Feuille 1');

  worksheet.getCell('A1').value = 'Question';
  worksheet.getCell('B1').value = 'Photo de la question';
  worksheet.getCell('C1').value = 'Synthèse';

  let questionCount = 0;

  shuffle(allQuestions); // Mélanger les questions
  const randomRowIndices = getRandomUniqueIndices(allQuestions.length, questionsListMax);

  randomRowIndices.forEach(randomIndex => {
    const questionData = allQuestions[randomIndex];
    const question = questionData?.question || '';
    const rectoPhoto = questionData?.rectoPhoto || '';
    const synthese = questionData?.synthese || '';
    const photoPath = questionData?.photoPath || '';

    // Vérifiez si la question existe déjà dans le tableau des questions ajoutées
    if (!questionsAjoutees.includes(question)) {
      // Ajoutez la question au tableau des questions ajoutées
      questionsAjoutees.push(question);

      // Ajoutez la question au fichier Excel
      worksheet.getCell(`A${questionCount + 2}`).value = question;

      if (rectoPhoto && photoPath && fs.existsSync(photoPath)) {
        const imageId = workbook.addImage({
          filename: photoPath,
          extension: 'png',
        });

        worksheet.addImage(imageId, {
          tl: { col: 1, row: questionCount + 1 },
          br: { col: 3, row: questionCount + 2 },
        });
      }

      worksheet.getCell(`C${questionCount + 2}`).value = synthese;

      questionCount++;
    }
    else {
      console.log(question)
    }
  });

  const filePath = path.join(__dirname, 'public/download', `${filename}.xlsx`);
  console.log('Fichier créé : ' + filePath);

  workbook.xlsx
    .writeFile(filePath)
    .then(() => {
      // Attendre que le fichier soit écrit avant de renvoyer la réponse d'état
      fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
          // Le fichier n'existe pas ou n'est pas un fichier valide, renvoyer une réponse indiquant qu'il n'est pas prêt
          res.json({ ready: false });
          console.log('Echec :', err);
        } else {
          // Le fichier existe, renvoyer une réponse indiquant qu'il est prêt
          res.json({ ready: true });
          console.log('');
        }
      });
    })
    .catch((error) => {
      console.error('Une erreur s\'est produite lors de la création du fichier Excel :', error);
      res.status(500).json({ error: 'Une erreur s\'est produite lors de la création du fichier Excel.' });
    });
});


// Endpoint pour télécharger le fichier
app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'public/download', `${filename}.xlsx`);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Le fichier n'existe pas ou n'est pas un fichier valide, renvoyer une réponse d'erreur
      res.status(404).send('Fichier non trouvé.');
    } else {
      // Le fichier existe, télécharger le fichier
      res.download(filePath, `${filename}.xlsx`, (error) => {
        if (error) {
          console.error('Une erreur s\'est produite lors du téléchargement du fichier :', error);
          res.status(500).send('Une erreur s\'est produite lors du téléchargement du fichier.');
        }
      });
    }
  });
});

// Endpoint pour vérifier l'état du fichier
app.get('/fileStatus/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'public/download', `${filename}.xlsx`);
  console.log(filePath)

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Le fichier n'existe pas ou n'est pas un fichier valide, renvoyer une réponse indiquant qu'il n'est pas prêt
      res.json({ ready: false });
    } else {
      // Le fichier existe, renvoyer une réponse indiquant qu'il est prêt
      res.json({ ready: true });
    }
  });
});


// Démarrer le serveur
const port = 8080;
app.listen(port, () => {
  console.log(`Le serveur est en écoute sur le port ${port}`);
});

function getSyntheseFromFolderName(folderName) {
  const parts = folderName.split('---');
  const synthesePart = parts[0].split('-');
  const synthese = synthesePart[0].charAt(0).toUpperCase() + synthesePart[0].slice(1);
  const numero = synthesePart[1];
  const classe = parts[1].split('_')[0];
  const classeName = `${classe.charAt(0).toUpperCase()} ${classe.slice(1).replace(/_/g, ' ')}`;

  return `${synthese} ${numero} de la classe des ${classeName}`;
}
function getRandomUniqueIndices(maxIndex, count) {
  const indices = [];
  const availableIndices = Array.from({ length: maxIndex }, (_, i) => i);

  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * availableIndices.length);
    indices.push(availableIndices.splice(randomIndex, 1)[0]);
  }

  return indices;
}
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}