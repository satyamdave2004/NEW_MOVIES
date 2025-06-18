document.addEventListener("DOMContentLoaded", function() {
    const links = document.querySelectorAll('[id^="justwatch-link-"]'); // Select all links starting with "justwatch-link"
  
    links.forEach(link => {
      const nameWithHyphens = link.dataset.name.replace(/ /g, '-');  // Replaces spaces with hyphens
      const type = link.dataset.type=="series"? 'tv-show' : 'movie';
      const justwatchUrl = `https://www.justwatch.com/in/${type}/${nameWithHyphens}`;
      const altu = `https://www.justwatch.com/in/search?q=${nameWithHyphens}`;
  
      // Fetch and update the link href dynamically
      fetch(justwatchUrl)
        .then(response => {
          if (response.ok) {
            link.href = justwatchUrl;
          } else {
            link.href = altu;
          }
        })
        .catch(error => {
          link.href = '#';
        });
    });
  });
  