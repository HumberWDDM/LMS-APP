document.addEventListener("DOMContentLoaded", function () {
    const yearContainer = document.getElementById("year")
    const today = new Date()

    yearContainer.textContent = `${today.getFullYear()}`

})