window.addEventListener("load", function () {
    // Ukryj preloader po załadowaniu strony
    const preloader = document.getElementById('preloader');
    const content = document.getElementById('content');
    
    preloader.style.display = 'none';  // Ukryj preloader
    content.style.display = 'block';   // Pokaż zawartość strony
  });
  