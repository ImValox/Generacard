$(function () {
  var uah_min = $("#questions_min");
  var uah_max = $("#questions_max");
  var questions_list_min = $("#questions_list_min");
  var questions_list_max = $("#questions_list_max");

  $("#questions").slider({
    range: true,
    min: 0,
    max: 35,
    values: [0, 35],
    create: function () {
      uah_min.text(0);
      uah_max.text(35);
      questions_list_min.val(0);
      questions_list_max.val(35);
    },
    slide: function (event, ui) {
      uah_min.text(ui.values[0]);
      uah_max.text(ui.values[1]);
      questions_list_min.val(ui.values[0]);
      questions_list_max.val(ui.values[1]);
    }
  });
});

$(document).ready(function () {
  var uniqueNumbers = new Set();
  var errorMessage = null;

  function showError(message) {
    if (errorMessage) {
      errorMessage.text(message);
    } else {
      errorMessage = $('<div class="error-message"></div>');
      errorMessage.text(message);
      $('#errorContainer').append(errorMessage);
    }
  }

  function showFoldersBySavedNumbers() {
    var syntheseNumbers = Array.from(uniqueNumbers);

    if (syntheseNumbers.length === 0) {
      $('.folder-item').show();
    } else {
      $('.folder-item').hide();
      syntheseNumbers.forEach(function (syntheseNumber) {
        $('[data-synthese="' + syntheseNumber + '"]').show();
      });
    }
  }

  function hideFoldersBySavedNumbers() {
    var syntheseNumbers = Array.from(uniqueNumbers);

    if (syntheseNumbers.length === 0) {
      $('.folder-item').show();
    } else {
      $('.folder-item').hide();
      syntheseNumbers.forEach(function (syntheseNumber) {
        $('[data-synthese="' + syntheseNumber + '"]').show();
      });
    }
  }

  function hideFoldersByNumber(syntheseNumber) {
    $('[data-synthese="' + syntheseNumber + '"]').hide();
  }

  $('#syntheseInput').keypress(function (event) {
    if (event.which === 13) {
      event.preventDefault();
      var inputNumber = $('#syntheseInput').val();

      if (/^\d+$/.test(inputNumber)) {
        if (uniqueNumbers.has(inputNumber)) {
          showError('Ce numéro a déjà été ajouté.');
        } else {
          uniqueNumbers.add(inputNumber);

          var listItem = $('<div class="synthese-item"></div>');
          listItem.append('<span class="number">' + ' ' + inputNumber + '</span>');
          listItem.append('<span class="close">&times;</span>');
          $('#syntheseList').append(listItem);
          $('#syntheseInput').val('');

          if (errorMessage) {
            errorMessage.remove();
            errorMessage = null;
          }

          showFoldersBySavedNumbers();
        }
      } else {
        showError('Veuillez saisir un numéro valide.');
      }
    }
  });

  $('#syntheseList').on('click', '.close', function () {
    var number = $(this).prev('.number').text().trim();
    uniqueNumbers.delete(number);
    $(this).parent('.synthese-item').remove();

    hideFoldersBySavedNumbers();
  });

  function filterFoldersByClasse(classe) {
    $('.folder-item').hide();

    if (classe === 'all') {
      $('.folder-item').show();
    } else {
      $('[data-classe]').each(function () {
        var folderClasse = parseInt($(this).attr('data-classe'));
        var selectedClasse = parseInt(classe);

        if (folderClasse >= selectedClasse) {
          $(this).show();
        }
      });
    }
  }

  $('#classeSelect').change(function () {
    var selectedClasse = $(this).val();

    filterFoldersByClasse(selectedClasse);
  });

  // Fonction pour filtrer les dossiers par synthèse
  function filterFoldersBySynthese(synthese) {
    $('.folder-item').hide();

    if (synthese === 'all') {
      $('.folder-item').show();
    } else {
      $('[data-synthese]').each(function () {
        var folderSynthese = parseInt($(this).attr('data-synthese'));
        var selectedSynthese = parseInt(synthese);

        if (folderSynthese === selectedSynthese) {
          $(this).show();
        }
      });
    }
  }

  // Filtrer les dossiers par synthèse
  $('#syntheseSelect').change(function () {
    var selectedSynthese = $(this).val();

    filterFoldersBySynthese(selectedSynthese);
  });

  showFoldersBySavedNumbers();
});


$(document).ready(function () {
  // Fonction pour récupérer tous les dossiers disponibles et les afficher
  function fetchAllFolders() {
    $.ajax({
      method: 'GET',
      url: '/allFolders',
      success: function (response) {
        // Effacer la liste des dossiers actuelle
        $('#folderList').empty();

        // Ajouter tous les dossiers récupérés à la liste
        response.folders.forEach(function (folder) {
          var synthese = getSyntheseFromFolderName(folder);
          var classe = getClasseFromFolderName(folder);
          var numero = getNumeroFromFolderName(folder);

          $('#folderList').append('<span class="folder-item synthese-' + synthese.toLowerCase().replace(/\s/g, '-') + ' classe-' + classe.toLowerCase().replace(/\s/g, '-') + '" data-synthese="' + numero + '" data-classe="' + classe + '"><label class="custom-control custom-checkbox"><input type="checkbox" class="custom-control-input" name="selectedFolder" data-synthese="' + numero + '" data-classe="' + classe + '" value="' + folder + '"><span class="custom-control-indicator"></span><span class="custom-control-description">' + synthese + '</span></label></span>');
        });
      },
      error: function (xhr, status, error) {
        console.log('Erreur lors de la récupération de tous les dossiers :', error);
      }
    });
  }

  // Actualiser la liste des dossiers au chargement de la page
  fetchAllFolders();

  // Gérer l'événement de changement de valeur pour la liste déroulante des niveaux
  $('#niveauSelect').on('change', function () {
    var selectedniveau = $(this).val().toLowerCase();

    // Afficher ou masquer les dossiers en fonction de la niveau sélectionnée
    $('#folderList .folder-item').each(function () {
      var folderItem = $(this);
      var niveauClass = 'niveau-' + selectedniveau.toLowerCase().replace(/\s/g, '-');

      if (selectedniveau === '' || folderItem.hasClass(niveauClass)) {
        folderItem.show();
      } else {
        folderItem.hide();
      }
    });
  });

  // Fonction pour obtenir la synthèse à partir du nom du dossier
  function getSyntheseFromFolderName(folderName) {
    var parts = folderName.split('---');
    var synthesePart = parts[0].split('-');
    var synthese = synthesePart[0].charAt(0).toUpperCase() + synthesePart[0].slice(1);
    var numero = synthesePart[1];
    var classe = parts[1].split('_')[0];
    var classeName = classe.charAt(0).toUpperCase() + classe.slice(1).replace(/_/g, ' ');

    return synthese + ' ' + numero + ' des ' + classeName;
  }

  // Fonction pour obtenir le numéro à partir du nom du dossier
  function getNumeroFromFolderName(folderName) {
    var parts = folderName.split('---');
    var synthesePart = parts[0].split('-');
    var numero = synthesePart[1];

    return numero;
  }

  // Fonction pour obtenir le nombre à partir du nom du dossier
  function getClasseFromFolderName(folderName) {
    var parts = folderName.split('---');
    var lastPart = parts[parts.length - 1];
    var matches = lastPart.match(/\d+/);

    if (matches && matches.length > 0) {
      var number = matches[0];
      return number;
    }

    return null;
  }

});

// Gérer les événements de sélection des dossiers
$('input[name="selectedFolder"]').change(function () {
  updateSelectedFolders();
});

// Fonction pour mettre à jour la liste des dossiers sélectionnés
function updateSelectedFolders() {
  var selectedFolders = [];
  $('input[name="selectedFolder"]:checked').each(function () {
    selectedFolders.push($(this).val());
  });

  if (selectedFolders.length > 0) {
    $('#downloadButton').prop('disabled', false);
  } else {
    $('#downloadButton').prop('disabled', true);
  }
}

// Gérer l'événement de téléchargement
$('#downloadButton').click(function () {
  var selectedFolders = [];
  $('input[name="selectedFolder"]:checked').each(function () {
    selectedFolders.push($(this).val());
  });

  // Récupérer le nom du fichier
  var filename = $('#nameInput').val();

  if (filename === '') {
    filename = 'Template';
  }
  // Récupérer les valeurs du nombre de mots sélectionné
  var questionsListMax = parseInt($('#questions_list_max').val());

  // Requête POST pour télécharger les dossiers sélectionnés
  // Requête POST pour télécharger les dossiers sélectionnés
  $.ajax({
    method: 'POST',
    url: '/download',
    data: {
      folders: selectedFolders,
      questionsListMax: questionsListMax,
      filename: filename
    },
    success: function (response) {
      if (response.ready) {
        // Le fichier est prêt à être téléchargé, rediriger l'utilisateur vers l'URL de téléchargement
        window.location.href = `/download/${filename}.xlsx`;
      } else {
        // Le fichier n'est pas encore prêt, afficher un message d'attente à l'utilisateur
        console.log('En attente du fichier...');
        // Exécuter une fonction de vérification périodique pour savoir quand le fichier est prêt
        checkFileStatus(filename);
      }
    },
    error: function (xhr, status, error) {
      console.log('Erreur lors de la création du Fichier :', error);
    }
  });
});

$(document).ready(function () {
  // Event listener for the "Tout prendre" checkbox
  $('#selectedAllFolder').change(function () {
    // Get the state of the "Tout prendre" checkbox
    var isChecked = $(this).prop('checked');

    // Set the state of all other checkboxes accordingly
    $('input[name="selectedFolder"]').prop('checked', isChecked);
  });
});

document.addEventListener('DOMContentLoaded', function() {
  function searchAndShowOnly(searchTerm) {
    var folderList = document.getElementById('folderList');
    var elements = folderList.getElementsByClassName('custom-control-description');

    for (var i = 0; i < elements.length; i++) {
      var element = elements[i];
      var text = element.textContent || element.innerText;

      if (text.includes(searchTerm)) {
        element.parentElement.style.display = '';
      } else {
        element.parentElement.style.display = 'none';
      }
    }
  }

  var searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', function() {
    var searchTerm = searchInput.value;
    searchAndShowOnly(searchTerm);
  });
});

document.getElementById('downloadButton').addEventListener('click', function() {
  // Récupérer le nom du fichier
  var fileName = $('#nameInput').val();
  if (fileName === '') {
    fileName = 'Template';
  }
  var downloadPath = '/download/' + fileName + '.xlsx';

  // Envoyer une requête AJAX pour vérifier l'état de génération du fichier
  checkFileStatus(downloadPath);
});

// Fonction pour vérifier périodiquement l'état du fichier
function checkFileStatus(filename) {
  // Vérifier l'état du fichier toutes les 2 secondes
  const interval = setInterval(() => {
    $.ajax({
      method: 'GET',
      url: `/fileStatus/${filename}`,
      success: function (response) {
        if (response.ready) {
          // Le fichier est prêt, arrêter la vérification périodique et rediriger l'utilisateur vers l'URL de téléchargement
          clearInterval(interval);
          window.location.href = `/download/${filename}.xlsx`;
        }
      },
      error: function (xhr, status, error) {
        console.error('Une erreur s\'est produite lors de la vérification de l\'état du fichier:', error);
        clearInterval(interval);
      }
    });
  }, 2000); // Vérifier toutes les 2 secondes
}
