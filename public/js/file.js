$(document).ready(function () {
    // Function to handle folder deletion
    function deleteSelectedFolders() {
        // Get all selected folders
        var selectedFolders = $('input[name="selectedFolder"]:checked');

        // Check if any folders are selected
        if (selectedFolders.length > 0) {
            // Loop through each selected folder
            selectedFolders.each(function () {
                var folder = $(this).closest('.folder-item');
                var syntheseNumber = folder.attr('data-synthese');
                var classeNumber = folder.attr('data-classe');

                // Perform deletion logic for the folder (replace this with your own implementation)
                // For example, you can make an AJAX request to delete the folder on the server
                console.log('Deleting folder: Synthese ' + syntheseNumber + ' des ' + classeNumber + 'eme');

                // Remove the folder from the DOM
                folder.remove();
            });
        } else {
            // No folders selected, display an alert or message
            alert('Veuillez sélectionner au moins un dossier à supprimer.');
        }
    }

    // Attach click event handler to the delete button
    $('.file-remove').click(function (e) {
        e.preventDefault();
        deleteSelectedFolders();
    });
});

// Gérer l'événement de suppréssion
$('#deleteSelectedFolders').click(function () {
    var selectedFolders = [];
    $('input[name="selectedFolder"]:checked').each(function () {
        selectedFolders.push($(this).val());
    });
    // Requête POST pour supprimé les dossiers sélectionnés
    $.ajax({
        method: 'POST',
        url: '/deleteFolder',
        data: {
            folders: selectedFolders
        },
        success: function (response) {
            console.log('Suppréssion réussi');
        },
        error: function (xhr, status, error) {
            console.log('Erreur lors de la suppréssion :', error);
        }
    });
});

// Gérer le clic sur le bouton "Add Folders"
$('#addFolders').click(function() {
    $('#fileInput').click(); // Simuler un clic sur le champ de téléchargement de fichiers
  });
  
  // Gérer l'événement de sélection de fichiers
  $('#fileInput').change(function(e) {
    var files = e.target.files; // Récupérer les fichiers sélectionnés
  
    // Envoyer les fichiers au serveur via une requête AJAX
    var formData = new FormData();
    for (var i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
  
    $.ajax({
      method: 'POST',
      url: '/upload',
      data: formData,
      processData: false,
      contentType: false,
      success: function(response) {
        console.log('Téléchargement réussi');
      },
      error: function(xhr, status, error) {
        console.log('Erreur lors du téléchargement :', error);
      }
    });
  });
  