document.addEventListener("DOMContentLoaded", function () {
  const fileInput = document.getElementById("thumbnail");
  const previewContainer = document.getElementById("image-preview");
  const previewImg = document.getElementById("preview-img");

  fileInput.addEventListener("change", function () {
    // Check if a file was selected
    if (this.files && this.files[0]) {
      previewContainer.style.display = "block";

      const reader = new FileReader();
      reader.onload = function (e) {
        previewImg.src = e.target.result;
      };
      reader.readAsDataURL(this.files[0]);// read the file as URL
    } else {
      previewContainer.style.display = "none";
      previewImg.src = "";
    }
  });
});
